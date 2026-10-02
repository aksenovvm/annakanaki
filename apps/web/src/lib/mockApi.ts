/**
 * Этап 2: «ненастоящий» API.
 * Функции возвращают Promise и ждут немного, как будто ходят на сервер,
 * поэтому интерфейс уже умеет показывать загрузку и ошибки.
 * На этапах 4–5 их тела заменятся на fetch к `/api/v1/...`, а сигнатуры останутся.
 *
 * Для проверки UI-состояний можно открыть:
 *   /book?simulate=error       — ошибка загрузки слотов
 *   /book?simulate=slot-taken  — слот «заняли» во время подтверждения (409 SLOT_TAKEN)
 */
import { barbers, mockSlotTimes, services } from "@/data/mock";
import { dayOfMonth, todayInShop } from "./date";

export type Simulate = "error" | "slot-taken" | null;

export class ApiError extends Error {
  constructor(
    public code: "NETWORK" | "SLOT_TAKEN",
    message: string,
  ) {
    super(message);
  }
}

const MIN_NOTICE_MIN = 30;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Текущее время в Ташкенте в минутах от полуночи */
function nowMinutesInShop(now = new Date()): number {
  const [h, m] = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(now)
    .split(":")
    .map(Number);
  return h * 60 + m;
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export async function getAvailableSlots(params: {
  date: string;
  barberId: string;
  serviceIds: string[];
  simulate?: Simulate;
}): Promise<string[]> {
  await wait(600);
  if (params.simulate === "error") {
    throw new ApiError("NETWORK", "Не удалось загрузить свободное время");
  }

  // Чтобы увидеть пустое состояние: у каждого мастера часть дней «полностью занята».
  const barberIndex = Math.max(0, barbers.findIndex((b) => b.id === params.barberId));
  if ((dayOfMonth(params.date) + barberIndex) % 5 === 0) return [];

  // Сегодня нельзя записаться на прошедшее время или ближе чем за MIN_NOTICE_MIN минут.
  if (params.date === todayInShop()) {
    const earliest = nowMinutesInShop() + MIN_NOTICE_MIN;
    return mockSlotTimes.filter((t) => toMinutes(t) >= earliest);
  }
  return mockSlotTimes;
}

export type BookingRequest = {
  serviceIds: string[];
  barberId: string;
  startsAt: string;
  client: { name: string; phone: string };
};

export type BookingResult = {
  id: string;
  manageToken: string;
  barberId: string;
  startsAt: string;
  totalPrice: number;
  totalDurationMin: number;
};

export async function createBooking(req: BookingRequest, simulate?: Simulate): Promise<BookingResult> {
  await wait(900);
  if (simulate === "slot-taken") {
    throw new ApiError("SLOT_TAKEN", "Это время только что заняли");
  }

  // Для «Любой свободный» сервер сам выберет мастера. Здесь — первый подходящий.
  const barberId =
    req.barberId === "any"
      ? barbers.find((b) => req.serviceIds.every((id) => b.serviceIds.includes(id)))!.id
      : req.barberId;

  const chosen = services.filter((s) => req.serviceIds.includes(s.id));
  return {
    id: crypto.randomUUID(),
    manageToken: crypto.randomUUID().replace(/-/g, ""),
    barberId,
    startsAt: req.startsAt,
    totalPrice: chosen.reduce((sum, s) => sum + s.price, 0),
    totalDurationMin: chosen.reduce((sum, s) => sum + s.durationMin, 0),
  };
}
