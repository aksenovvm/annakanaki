/**
 * Расчёт свободного времени (docs/spec.md, раздел 7).
 *
 * Здесь только «чистые» функции: никакой базы, только входные данные → результат.
 * Поэтому их легко проверять тестами (availability.test.ts).
 *
 * Все моменты времени — миллисекунды UTC (Date.getTime()).
 * Рабочие часы и обеды — минуты от полуночи по Ташкенту (10:00 → 600).
 */
import {
  MINUTE_MS,
  addDays,
  isoWeekday,
  shopDayStart,
  toShopDate,
  todayInShop,
} from "@barbershop/shared";

/** Отрезок времени [start, end) в миллисекундах UTC */
export type Interval = { start: number; end: number };

/** Отрезок внутри дня в минутах от полуночи: 10:00–21:00 → { start: 600, end: 1260 } */
export type DayRange = { start: number; end: number };

/** Всё, что нужно знать о мастере, чтобы посчитать его свободное время */
export type BarberCalendar = {
  barberId: string;
  /** Общая длительность выбранных услуг у этого мастера (с учётом его переопределений) */
  durationMin: number;
  /** Рабочие часы по дням недели (1 = пн … 7 = вс). Нет ключа — выходной. */
  workingHours: Map<number, DayRange>;
  /** Обеды и другие регулярные перерывы по дням недели */
  breaks: Map<number, DayRange[]>;
  /** Отпуска, больничные, закрытие барбершопа */
  timeOff: Interval[];
  /** Уже существующие подтверждённые записи */
  bookings: Interval[];
};

export type AvailabilitySettings = {
  /** Шаг сетки времени: 15 → 10:00, 10:15, 10:30… */
  slotStepMin: number;
  /** Нельзя записаться ближе, чем за столько минут */
  minNoticeMin: number;
  /** На сколько дней вперёд можно записаться */
  bookingHorizonDays: number;
};

export type StartCheck = "OK" | "TOO_SOON" | "TOO_FAR" | "OUTSIDE_WORKING_HOURS" | "SLOT_TAKEN";

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/** Последний день, на который ещё можно записаться */
export function lastBookableDate(settings: AvailabilitySettings, now: Date): string {
  return addDays(todayInShop(now), settings.bookingHorizonDays);
}

/** Рабочий день мастера в конкретную дату — абсолютные отрезки работы и перерывов */
function workDay(cal: BarberCalendar, date: string): { work: Interval; breaks: Interval[] } | null {
  const weekday = isoWeekday(date);
  const hours = cal.workingHours.get(weekday);
  if (!hours) return null;

  const dayStart = shopDayStart(date).getTime();
  const toInterval = (r: DayRange): Interval => ({
    start: dayStart + r.start * MINUTE_MS,
    end: dayStart + r.end * MINUTE_MS,
  });
  return { work: toInterval(hours), breaks: (cal.breaks.get(weekday) ?? []).map(toInterval) };
}

/**
 * Свободные начала записи у одного мастера в один день.
 * Возвращает моменты начала (мс UTC) по возрастанию.
 */
export function slotsForDay(cal: BarberCalendar, date: string, settings: AvailabilitySettings, now: Date): number[] {
  // 1. Только сегодня … последний доступный день
  if (date < todayInShop(now) || date > lastBookableDate(settings, now)) return [];

  // 2. Рабочее время мастера в этот день недели
  const day = workDay(cal, date);
  if (!day) return [];

  // 3. Всё, что занято: обеды, исключения, другие записи
  const blocked = [...day.breaks, ...cal.timeOff, ...cal.bookings];

  const durationMs = cal.durationMin * MINUTE_MS;
  const stepMs = settings.slotStepMin * MINUTE_MS;
  const earliest = now.getTime() + settings.minNoticeMin * MINUTE_MS;

  // 4. Перебираем старты с шагом slot_step_min и оставляем те, где вся услуга помещается
  const slots: number[] = [];
  for (let start = day.work.start; start + durationMs <= day.work.end; start += stepMs) {
    if (start < earliest) continue; // прошлое и слишком скоро
    const visit = { start, end: start + durationMs };
    if (blocked.some((b) => overlaps(b, visit))) continue;
    slots.push(start);
  }
  return slots;
}

/**
 * Можно ли начать запись в этот момент. Используется при создании и переносе:
 * сервер не верит интерфейсу и перепроверяет всё сам.
 */
export function checkStart(cal: BarberCalendar, startMs: number, settings: AvailabilitySettings, now: Date): StartCheck {
  if (startMs < now.getTime() + settings.minNoticeMin * MINUTE_MS) return "TOO_SOON";

  const date = toShopDate(new Date(startMs));
  if (date > lastBookableDate(settings, now)) return "TOO_FAR";

  const day = workDay(cal, date);
  const visit = { start: startMs, end: startMs + cal.durationMin * MINUTE_MS };
  if (!day || visit.start < day.work.start || visit.end > day.work.end) return "OUTSIDE_WORKING_HOURS";
  if ([...day.breaks, ...cal.timeOff].some((b) => overlaps(b, visit))) return "OUTSIDE_WORKING_HOURS";

  if (cal.bookings.some((b) => overlaps(b, visit))) return "SLOT_TAKEN";
  return "OK";
}

/**
 * «Любой свободный»: объединяем слоты нескольких мастеров.
 * Возвращает время начала → мастера, которые свободны в это время.
 */
export function mergeSlots(
  calendars: BarberCalendar[],
  date: string,
  settings: AvailabilitySettings,
  now: Date,
): Map<number, string[]> {
  const merged = new Map<number, string[]>();
  for (const cal of calendars) {
    for (const start of slotsForDay(cal, date, settings, now)) {
      merged.set(start, [...(merged.get(start) ?? []), cal.barberId]);
    }
  }
  return new Map([...merged.entries()].sort(([a], [b]) => a - b));
}

/**
 * Кого из свободных мастеров выбрать для «Любой свободный»:
 * того, у кого в этот день меньше всего уже занятых минут (чтобы нагрузка распределялась).
 */
export function pickLeastBusy<T extends BarberCalendar>(calendars: T[], date: string): T[] {
  const dayStart = shopDayStart(date).getTime();
  const day = { start: dayStart, end: dayStart + 24 * 60 * MINUTE_MS };
  const busyMinutes = (cal: BarberCalendar) =>
    cal.bookings.filter((b) => overlaps(b, day)).reduce((sum, b) => sum + (b.end - b.start) / MINUTE_MS, 0);
  // sort стабильный: при равной загрузке сохраняется исходный порядок мастеров
  return [...calendars].sort((a, b) => busyMinutes(a) - busyMinutes(b));
}

/** Можно ли ещё отменить или перенести запись */
export function canChangeBooking(
  booking: { status: string; startsAt: Date },
  cancelCutoffMin: number,
  now: Date,
): boolean {
  return booking.status === "confirmed" && booking.startsAt.getTime() - now.getTime() >= cancelCutoffMin * MINUTE_MS;
}
