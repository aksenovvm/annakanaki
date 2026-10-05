import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { isOverlapError, type Prisma } from "@barbershop/db";
import {
  MINUTE_MS,
  bookingSchema,
  createBookingRequestSchema,
  rescheduleRequestSchema,
  toShopDate,
  type Booking,
} from "@barbershop/shared";
import { prisma } from "../db";
import { canChangeBooking, checkStart, pickLeastBusy, type StartCheck } from "../domain/availability";
import { loadBarberOptions, type BarberOption } from "../domain/calendars";
import { loadSettings, type ShopSettings } from "../domain/settings";
import { AppError } from "../errors";

const bookingInclude = {
  barber: true,
  client: true,
  services: true,
} satisfies Prisma.BookingInclude;

type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

/** Длинный случайный токен для ссылки управления записью: 32 символа, ~192 бита случайности */
const newManageToken = () => randomBytes(24).toString("base64url");

/** Понятные ошибки для каждого результата проверки времени */
function startCheckError(result: Exclude<StartCheck, "OK">, settings: ShopSettings): AppError {
  switch (result) {
    case "SLOT_TAKEN":
      return new AppError(409, "SLOT_TAKEN", "Это время уже занято. Выберите другое.");
    case "TOO_SOON":
      return new AppError(422, "TOO_SOON", `Записаться можно не позднее чем за ${settings.minNoticeMin} мин до начала.`);
    case "TOO_FAR":
      return new AppError(422, "TOO_FAR", `Записаться можно не более чем на ${settings.bookingHorizonDays} дней вперёд.`);
    case "OUTSIDE_WORKING_HOURS":
      return new AppError(422, "OUTSIDE_WORKING_HOURS", "В это время мастер не работает.");
  }
}

export function toBookingDto(b: BookingRow, settings: ShopSettings, now = new Date()): Booking {
  return bookingSchema.parse({
    id: b.id,
    manageToken: b.manageToken,
    status: b.status,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    totalPrice: b.totalPrice,
    totalDurationMin: b.totalDurationMin,
    barber: { id: b.barber.id, name: b.barber.name },
    services: b.services.map((s) => ({ serviceId: s.serviceId, name: s.name, price: s.price, durationMin: s.durationMin })),
    client: { name: b.client.name, phone: b.client.phone },
    canChange: canChangeBooking(b, settings.cancelCutoffMin, now),
    cancelCutoffMin: settings.cancelCutoffMin,
  });
}

async function findByToken(token: string): Promise<BookingRow> {
  const booking = await prisma.booking.findUnique({ where: { manageToken: token }, include: bookingInclude });
  if (!booking) throw new AppError(404, "BOOKING_NOT_FOUND", "Запись не найдена");
  return booking;
}

/** Отмена и перенос — только у подтверждённой записи и не позже лимита до начала */
function assertCanChange(booking: BookingRow, settings: ShopSettings) {
  if (booking.status !== "confirmed") {
    throw new AppError(409, "BOOKING_NOT_ACTIVE", "Запись уже отменена или завершена");
  }
  if (!canChangeBooking(booking, settings.cancelCutoffMin, new Date())) {
    throw new AppError(
      422,
      "TOO_LATE_TO_CHANGE",
      `Отменить или перенести запись можно не позднее чем за ${settings.cancelCutoffMin} мин до начала. Позвоните нам.`,
    );
  }
}

const tokenParams = z.object({ token: z.string().min(10).max(100) });

export async function bookingsRoutes(app: FastifyInstance) {
  /** POST /api/v1/bookings — создать запись */
  app.post("/bookings", async (request, reply) => {
    // 1. Проверяем входные данные
    const body = createBookingRequestSchema.parse(request.body);
    const startsAt = new Date(body.startsAt);
    const date = toShopDate(startsAt);
    const now = new Date();
    const settings = await loadSettings();

    // 2–6. Услуги, мастер, длительность, цена, расписание, исключения, текущие записи
    const options = await loadBarberOptions({ serviceIds: body.serviceIds, barberId: body.barberId, from: date, to: date });
    if (options.length === 0) {
      throw new AppError(422, "BARBER_CANNOT_PERFORM", "Нет мастера, который выполняет все выбранные услуги");
    }

    // 7. Актуальная доступность — сервер не верит интерфейсу и проверяет время сам
    const checks = options.map((o) => ({ option: o, result: checkStart(o, startsAt.getTime(), settings, now) }));
    const free = checks.filter((c) => c.result === "OK").map((c) => c.option);
    if (free.length === 0) {
      // Если хоть у кого-то время просто занято — это SLOT_TAKEN, иначе — первая причина
      const taken = checks.find((c) => c.result === "SLOT_TAKEN");
      throw startCheckError((taken ?? checks[0]).result as Exclude<StartCheck, "OK">, settings);
    }

    // Для «Любой свободный» — сначала наименее загруженный мастер
    const candidates: BarberOption[] = body.barberId === "any" ? pickLeastBusy(free, date) : free;

    // 8–9. Сохраняем в транзакции. Если за это время слот заняли — PostgreSQL вернёт 23P01.
    for (const option of candidates) {
      try {
        const booking = await prisma.$transaction(async (tx) => {
          // Клиент с сайта узнаётся по телефону. Имя берём из последней записи —
          // человек мог в прошлый раз написать его иначе.
          const existing = await tx.client.findFirst({
            where: { phone: body.client.phone },
            orderBy: { createdAt: "asc" },
          });
          const client = existing
            ? existing.name === body.client.name
              ? existing
              : await tx.client.update({ where: { id: existing.id }, data: { name: body.client.name } })
            : await tx.client.create({ data: { name: body.client.name, phone: body.client.phone } });

          return tx.booking.create({
            data: {
              clientId: client.id,
              barberId: option.barberId,
              startsAt,
              endsAt: new Date(startsAt.getTime() + option.durationMin * MINUTE_MS),
              totalPrice: option.totalPrice,
              totalDurationMin: option.durationMin,
              status: "confirmed",
              source: "web",
              manageToken: newManageToken(),
              // Снимок услуг: если цену потом поменяют, эта запись не изменится
              services: { create: option.services },
            },
            include: bookingInclude,
          });
        });
        // 10. Готово
        return reply.status(201).send(toBookingDto(booking, settings, now));
      } catch (error) {
        // Слот заняли между проверкой и сохранением — пробуем следующего мастера (для «любого»)
        if (isOverlapError(error)) continue;
        throw error;
      }
    }
    throw startCheckError("SLOT_TAKEN", settings);
  });

  /** GET /api/v1/bookings/:token — запись по секретной ссылке */
  app.get("/bookings/:token", async (request) => {
    const { token } = tokenParams.parse(request.params);
    const [booking, settings] = await Promise.all([findByToken(token), loadSettings()]);
    return toBookingDto(booking, settings);
  });

  /** POST /api/v1/bookings/:token/cancel — отменить */
  app.post("/bookings/:token/cancel", async (request) => {
    const { token } = tokenParams.parse(request.params);
    const [booking, settings] = await Promise.all([findByToken(token), loadSettings()]);
    assertCanChange(booking, settings);

    // updateMany с условием status = confirmed: если две отмены придут одновременно, сработает одна
    const { count } = await prisma.booking.updateMany({
      where: { id: booking.id, status: "confirmed" },
      data: { status: "cancelled" },
    });
    if (count === 0) throw new AppError(409, "BOOKING_NOT_ACTIVE", "Запись уже отменена или завершена");

    return toBookingDto(await findByToken(token), settings);
  });

  /** POST /api/v1/bookings/:token/reschedule — перенести на другое время (тот же мастер и услуги) */
  app.post("/bookings/:token/reschedule", async (request) => {
    const { token } = tokenParams.parse(request.params);
    const body = rescheduleRequestSchema.parse(request.body);
    const [booking, settings] = await Promise.all([findByToken(token), loadSettings()]);
    assertCanChange(booking, settings);

    const startsAt = new Date(body.startsAt);
    const date = toShopDate(startsAt);
    const [option] = await loadBarberOptions({
      serviceIds: booking.services.map((s) => s.serviceId),
      barberId: booking.barberId,
      from: date,
      to: date,
      excludeBookingId: booking.id, // своё старое время не мешает
    });
    // Длительность — как в исходной записи (из снимка услуг)
    const calendar = { ...option, durationMin: booking.totalDurationMin };

    const result = checkStart(calendar, startsAt.getTime(), settings, new Date());
    if (result !== "OK") throw startCheckError(result, settings);

    try {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          startsAt,
          endsAt: new Date(startsAt.getTime() + booking.totalDurationMin * MINUTE_MS),
          // напоминания нужно будет отправить заново для нового времени (этап 8)
          reminderDaySentAt: null,
          reminder30mSentAt: null,
        },
      });
    } catch (error) {
      if (isOverlapError(error)) throw startCheckError("SLOT_TAKEN", settings);
      throw error;
    }
    return toBookingDto(await findByToken(token), settings);
  });
}
