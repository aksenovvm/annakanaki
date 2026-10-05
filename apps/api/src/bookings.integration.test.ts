/**
 * Интеграционные тесты записи: настоящий API + настоящая база (DATABASE_URL из apps/api/.env).
 * Запуск: npm run test:integration
 *
 * Тесты создают записи на свободное время в будущем и в конце удаляют всё, что создали.
 * Тестовые клиенты — с телефонами +998000000xxx.
 */
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Booking, Slot } from "@barbershop/shared";
import { addDays, todayInShop } from "@barbershop/shared";

let app: FastifyInstance;
let prisma: typeof import("./db").prisma;

let serviceId: string;
let barberId: string;
/** Дни, где у мастера много свободного времени. Каждому тесту — свой день, чтобы тесты не мешали друг другу. */
let testDays: string[] = [];
let testDayIndex = 0;
/** День текущего теста */
let testDate: string;

const createdBookingIds: string[] = [];
const TEST_PHONE_PREFIX = "+998000000";
let phoneCounter = 100;
const nextPhone = () => `${TEST_PHONE_PREFIX}${phoneCounter++}`;

/** Проверка кода ответа: при ошибке показывает тело ответа — так сразу видно причину */
function expectStatus(res: { statusCode: number; body: string }, status: number) {
  expect(res.statusCode, `ответ сервера: ${res.body}`).toBe(status);
}

async function freeSlots(date = testDate): Promise<Slot[]> {
  const res = await app.inject({
    method: "GET",
    url: `/api/v1/availability?serviceIds=${serviceId}&barberId=${barberId}&date=${date}`,
  });
  expectStatus(res, 200);
  return res.json().slots;
}

async function book(startsAt: string, barber = barberId) {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/bookings",
    payload: { serviceIds: [serviceId], barberId: barber, startsAt, client: { name: "Тест", phone: nextPhone() } },
  });
  if (res.statusCode === 201) createdBookingIds.push(res.json().id);
  return res;
}

beforeAll(async () => {
  ({ buildApp: app } = { buildApp: await (await import("./app")).buildApp() });
  ({ prisma } = await import("./db"));

  // Берём первую услугу и первого мастера, который её делает
  const barbers = (await app.inject({ method: "GET", url: "/api/v1/barbers" })).json().items;
  const barber = barbers.find((b: { services: unknown[] }) => b.services.length > 0);
  barberId = barber.id;
  serviceId = barber.services[0].serviceId;

  // Дни через неделю-три, где у мастера много свободного времени
  const res = await app.inject({
    method: "GET",
    url: `/api/v1/availability/days?serviceIds=${serviceId}&barberId=${barberId}&from=${addDays(todayInShop(), 7)}&days=21`,
  });
  testDays = res
    .json()
    .days.filter((d: { slotsCount: number }) => d.slotsCount >= 20)
    .map((d: { date: string }) => d.date);
  expect(testDays.length, "нужны дни со свободным временем").toBeGreaterThan(3);
});

beforeEach(() => {
  testDate = testDays[testDayIndex++ % testDays.length];
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
  await prisma.client.deleteMany({ where: { phone: { startsWith: TEST_PHONE_PREFIX } } });
  await app?.close();
  await prisma.$disconnect();
});

describe("защита от двойной записи", () => {
  it("два параллельных запроса на один слот: ровно один 201 и один 409", async () => {
    const [slot] = (await freeSlots()).slice(-1);

    const [a, b] = await Promise.all([book(slot.startsAt), book(slot.startsAt)]);

    expect([a.statusCode, b.statusCode].sort(), `ответы: ${a.body} | ${b.body}`).toEqual([201, 409]);
    const conflict = a.statusCode === 409 ? a : b;
    expect(conflict.json().code).toBe("SLOT_TAKEN");
  });

  it("десять параллельных запросов на каждый из трёх слотов: одна запись на слот, никаких 500", async () => {
    // При таком количестве одновременных запросов PostgreSQL иногда ловит deadlock (40P01).
    // API должен повторить транзакцию и ответить 409, а не 500.
    for (let round = 0; round < 3; round++) {
      // каждый раз берём заново: после записи соседние слоты, пересекающиеся с ней, пропадают
      const slots = await freeSlots();
      const slot = slots[Math.floor(slots.length / 2)];
      const results = await Promise.all(Array.from({ length: 10 }, () => book(slot.startsAt)));
      const codes = results.map((r) => r.statusCode);
      const bodies = results.map((r) => r.body).join(" | ");

      expect(codes.filter((c) => c === 201), bodies).toHaveLength(1);
      expect(codes.filter((c) => c === 409), bodies).toHaveLength(9);
    }
  });

  it("база сама не даёт сохранить пересекающуюся запись в обход API (23P01)", async () => {
    const { isOverlapError } = await import("@barbershop/db");
    const [slot] = await freeSlots();
    const res = await book(slot.startsAt);
    expectStatus(res, 201);
    const existing: Booking = res.json();

    const client = await prisma.client.create({ data: { name: "Тест", phone: nextPhone() } });
    const overlapping = prisma.booking.create({
      data: {
        clientId: client.id,
        barberId,
        startsAt: new Date(new Date(existing.startsAt).getTime() + 15 * 60_000), // на 15 минут позже — пересекается
        endsAt: new Date(new Date(existing.endsAt).getTime() + 15 * 60_000),
        totalPrice: 1,
        totalDurationMin: existing.totalDurationMin,
        source: "admin",
        manageToken: `test-${Date.now()}`,
      },
    });
    const error = await overlapping.then(() => null, (e: unknown) => e);
    expect(isOverlapError(error)).toBe(true);
  });
});

describe("deadlock при одновременных записях", () => {
  it("настоящий deadlock в PostgreSQL распознаётся как временная ошибка (40P01)", async () => {
    const { isRetryableError } = await import("@barbershop/db");
    // Две транзакции: каждая занимает «своё» время, а потом пытается занять время другой.
    // Обе ждут друг друга — PostgreSQL обнаружит deadlock и прервёт одну из них.
    const slots = await freeSlots();
    const [slotA, slotB] = [slots[0], slots.at(-1)!].map((s) => new Date(s.startsAt));
    const client = await prisma.client.create({ data: { name: "Тест", phone: nextPhone() } });
    const row = (start: Date, tag: string) => ({
      clientId: client.id,
      barberId,
      startsAt: start,
      endsAt: new Date(start.getTime() + 30 * 60_000),
      totalPrice: 1,
      totalDurationMin: 30,
      source: "admin" as const,
      manageToken: `test-deadlock-${tag}-${Date.now()}`,
    });

    // «Барьер»: вторые вставки начинаются только когда обе первые уже сделаны
    let arrived = 0;
    let release!: () => void;
    const bothReady = new Promise<void>((resolve) => (release = resolve));
    const meet = () => {
      if (++arrived === 2) release();
      return bothReady;
    };

    const run = (first: Date, second: Date, tag: string) =>
      prisma.$transaction(
        async (tx) => {
          const own = await tx.booking.create({ data: row(first, `${tag}1`) });
          await meet();
          const other = await tx.booking.create({ data: row(second, `${tag}2`) });
          return [own.id, other.id];
        },
        { timeout: 20_000 },
      );

    const results = await Promise.allSettled([run(slotA, slotB, "a"), run(slotB, slotA, "b")]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    for (const r of ok) createdBookingIds.push(...r.value);

    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(isRetryableError(failed[0].reason), String(failed[0].reason)).toBe(true);
  });
});

describe("запись, перенос и отмена", () => {
  it("создаёт запись, переносит её и отменяет", async () => {
    const slots = await freeSlots();
    const first = slots[1];
    const created = await book(first.startsAt);
    expectStatus(created, 201);
    const booking: Booking = created.json();
    expect(booking.status).toBe("confirmed");
    expect(booking.canChange).toBe(true);
    expect(booking.manageToken.length).toBeGreaterThanOrEqual(32);

    // Занятое время пропало из свободных
    expect((await freeSlots()).map((s) => s.startsAt)).not.toContain(first.startsAt);

    // Запись открывается по токену
    const view = await app.inject({ method: "GET", url: `/api/v1/bookings/${booking.manageToken}` });
    expectStatus(view, 200);
    expect(view.json().id).toBe(booking.id);

    // Перенос на другое свободное время
    const target = (await freeSlots()).at(-2)!;
    const moved = await app.inject({
      method: "POST",
      url: `/api/v1/bookings/${booking.manageToken}/reschedule`,
      payload: { startsAt: target.startsAt },
    });
    expectStatus(moved, 200);
    expect(moved.json().startsAt).toBe(target.startsAt);
    // Старое время снова свободно, новое — занято
    const after = (await freeSlots()).map((s) => s.startsAt);
    expect(after).toContain(first.startsAt);
    expect(after).not.toContain(target.startsAt);

    // Отмена
    const cancelled = await app.inject({ method: "POST", url: `/api/v1/bookings/${booking.manageToken}/cancel` });
    expectStatus(cancelled, 200);
    expect(cancelled.json().status).toBe("cancelled");
    expect(cancelled.json().canChange).toBe(false);
    expect((await freeSlots()).map((s) => s.startsAt)).toContain(target.startsAt);

    // Повторная отмена — 409
    const again = await app.inject({ method: "POST", url: `/api/v1/bookings/${booking.manageToken}/cancel` });
    expectStatus(again, 409);
    expect(again.json().code).toBe("BOOKING_NOT_ACTIVE");
  });

  it("перенос на 15 минут позже: своё старое время не мешает", async () => {
    // Берём время, у которого «+15 минут» тоже свободно (не упирается в обед или другую запись)
    const slots = (await freeSlots()).map((s) => s.startsAt);
    const plus15 = (iso: string) => new Date(new Date(iso).getTime() + 15 * 60_000).toISOString();
    const start = slots.find((s) => slots.includes(plus15(s)))!;
    const created = await book(start);
    const booking: Booking = created.json();
    const later = plus15(booking.startsAt);

    // Без токена это время занято самой записью…
    expect((await freeSlots()).map((s) => s.startsAt)).not.toContain(later);

    // …а в списке для переноса (с rescheduleToken) — свободно
    const withToken = await app.inject({
      method: "GET",
      url: `/api/v1/availability?serviceIds=${serviceId}&barberId=${barberId}&date=${testDate}&rescheduleToken=${booking.manageToken}`,
    });
    expect(withToken.json().slots.map((s: Slot) => s.startsAt)).toContain(later);

    const moved = await app.inject({
      method: "POST",
      url: `/api/v1/bookings/${booking.manageToken}/reschedule`,
      payload: { startsAt: later },
    });
    expectStatus(moved, 200);
  });

  it("перенос на занятое время — 409 SLOT_TAKEN", async () => {
    const a: Booking = (await book((await freeSlots())[0].startsAt)).json();
    const b: Booking = (await book((await freeSlots()).at(-1)!.startsAt)).json();

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/bookings/${b.manageToken}/reschedule`,
      payload: { startsAt: a.startsAt },
    });
    expectStatus(res, 409);
    expect(res.json().code).toBe("SLOT_TAKEN");
  });

  it("нельзя отменить позже чем за cancel_cutoff_min до начала — 422 TOO_LATE_TO_CHANGE", async () => {
    // Такую запись через API не создать (min_notice), поэтому кладём её прямо в базу
    const client = await prisma.client.create({ data: { name: "Тест", phone: nextPhone() } });
    const soon = new Date(Date.now() + 10 * 60_000);
    const row = await prisma.booking.create({
      data: {
        clientId: client.id,
        barberId,
        startsAt: soon,
        endsAt: new Date(soon.getTime() + 60 * 60_000),
        totalPrice: 1,
        totalDurationMin: 60,
        source: "admin",
        status: "completed", // не confirmed — чтобы не столкнуться с настоящими записями
        manageToken: `test-soon-${Date.now()}`,
      },
    });
    createdBookingIds.push(row.id);
    await prisma.booking.update({ where: { id: row.id }, data: { status: "confirmed" } }).catch(() => undefined);

    const current = await prisma.booking.findUniqueOrThrow({ where: { id: row.id } });
    const res = await app.inject({ method: "POST", url: `/api/v1/bookings/${row.manageToken}/cancel` });
    if (current.status === "confirmed") {
      expectStatus(res, 422);
      expect(res.json().code).toBe("TOO_LATE_TO_CHANGE");
    } else {
      // время оказалось занято настоящей записью — тогда запись не confirmed, и ответ 409
      expect(res.json().code).toBe("BOOKING_NOT_ACTIVE");
    }
  });
});

describe("проверки при создании", () => {
  it("неверные данные — 400 VALIDATION_ERROR", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/bookings", payload: { serviceIds: [] } });
    expectStatus(res, 400);
    expect(res.json().code).toBe("VALIDATION_ERROR");
  });

  it("ночью мастер не работает — 422 OUTSIDE_WORKING_HOURS", async () => {
    const res = await book(`${testDate}T03:00:00+05:00`);
    expectStatus(res, 422);
    expect(res.json().code).toBe("OUTSIDE_WORKING_HOURS");
  });

  it("в прошлое — 422 TOO_SOON, слишком далеко — 422 TOO_FAR", async () => {
    expect((await book("2020-01-01T10:00:00+05:00")).json().code).toBe("TOO_SOON");
    expect((await book(`${addDays(todayInShop(), 400)}T10:00:00+05:00`)).json().code).toBe("TOO_FAR");
  });

  it("«Любой свободный» выбирает мастера и сохраняет запись на него", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/availability?serviceIds=${serviceId}&barberId=any&date=${testDate}`,
    });
    const slot: Slot = res.json().slots.at(-4);
    const created = await book(slot.startsAt, "any");
    expectStatus(created, 201);
    expect(created.json().barber.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
