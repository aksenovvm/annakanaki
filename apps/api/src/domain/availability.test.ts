import { describe, expect, it } from "vitest";
import { shopDateTime, toShopTime } from "@barbershop/shared";
import {
  canChangeBooking,
  checkStart,
  mergeSlots,
  pickLeastBusy,
  slotsForDay,
  type AvailabilitySettings,
  type BarberCalendar,
} from "./availability";

// «Сейчас» — понедельник 5 октября 2026, 08:00 по Ташкенту
const NOW = shopDateTime("2026-10-05", "08:00");
// Проверяем вторник 6 октября
const DAY = "2026-10-06";

const settings: AvailabilitySettings = { slotStepMin: 60, minNoticeMin: 30, bookingHorizonDays: 30 };

const at = (time: string, date = DAY) => shopDateTime(date, time).getTime();
const times = (slots: number[]) => slots.map((s) => toShopTime(new Date(s)));

/** Мастер работает каждый день 10:00–14:00 без обеда, услуга — 60 минут */
function calendar(overrides: Partial<BarberCalendar> = {}): BarberCalendar {
  const everyDay = (start: number, end: number) => new Map([1, 2, 3, 4, 5, 6, 7].map((d) => [d, { start, end }]));
  return {
    barberId: "b1",
    durationMin: 60,
    workingHours: everyDay(600, 840),
    breaks: new Map(),
    timeOff: [],
    bookings: [],
    ...overrides,
  };
}

describe("slotsForDay", () => {
  it("строит слоты с шагом по всему рабочему дню", () => {
    expect(times(slotsForDay(calendar(), DAY, settings, NOW))).toEqual(["10:00", "11:00", "12:00", "13:00"]);
  });

  it("учитывает шаг сетки 15 минут", () => {
    const slots = slotsForDay(calendar(), DAY, { ...settings, slotStepMin: 15 }, NOW);
    expect(times(slots).slice(0, 3)).toEqual(["10:00", "10:15", "10:30"]);
    expect(times(slots).at(-1)).toBe("13:00"); // последний старт, при котором 60 минут помещаются до 14:00
  });

  it("не ставит запись на обед", () => {
    const cal = calendar({ breaks: new Map([[2, [{ start: 720, end: 780 }]]]) }); // вт 12:00–13:00
    expect(times(slotsForDay(cal, DAY, settings, NOW))).toEqual(["10:00", "11:00", "13:00"]);
  });

  it("услуга должна целиком помещаться до конца рабочего дня", () => {
    const cal = calendar({ durationMin: 90 });
    const slots = slotsForDay(cal, DAY, { ...settings, slotStepMin: 30 }, NOW);
    expect(times(slots).at(-1)).toBe("12:30"); // 12:30 + 90 мин = 14:00 — ровно конец дня
  });

  it("разные длительности дают разное число слотов", () => {
    const short = slotsForDay(calendar({ durationMin: 30 }), DAY, { ...settings, slotStepMin: 30 }, NOW);
    const long = slotsForDay(calendar({ durationMin: 120 }), DAY, { ...settings, slotStepMin: 30 }, NOW);
    expect(short).toHaveLength(8); // 10:00 … 13:30
    expect(long).toHaveLength(5); // 10:00 … 12:00
  });

  it("выходной день — нет слотов", () => {
    const cal = calendar({ workingHours: new Map([[1, { start: 600, end: 840 }]]) }); // работает только по пн
    expect(slotsForDay(cal, DAY, settings, NOW)).toEqual([]);
  });

  it("исключает существующие записи", () => {
    const cal = calendar({ bookings: [{ start: at("11:00"), end: at("12:00") }] });
    expect(times(slotsForDay(cal, DAY, settings, NOW))).toEqual(["10:00", "12:00", "13:00"]);
  });

  it("частичное пересечение с записью тоже исключает слот", () => {
    const cal = calendar({ bookings: [{ start: at("11:30"), end: at("12:00") }] });
    expect(times(slotsForDay(cal, DAY, settings, NOW))).toEqual(["10:00", "12:00", "13:00"]);
  });

  it("исключает time_off (отпуск на весь день)", () => {
    const cal = calendar({ timeOff: [{ start: at("00:00"), end: at("00:00", "2026-10-07") }] });
    expect(slotsForDay(cal, DAY, settings, NOW)).toEqual([]);
  });

  it("исключает time_off на часть дня", () => {
    const cal = calendar({ timeOff: [{ start: at("10:00"), end: at("12:00") }] });
    expect(times(slotsForDay(cal, DAY, settings, NOW))).toEqual(["12:00", "13:00"]);
  });

  it("сегодня: не показывает прошедшее время и учитывает min_notice_min", () => {
    const now = shopDateTime(DAY, "10:45"); // сейчас 10:45, минимум за 30 мин → с 11:15
    expect(times(slotsForDay(calendar(), DAY, settings, now))).toEqual(["12:00", "13:00"]);
  });

  it("прошедший день — пусто", () => {
    expect(slotsForDay(calendar(), "2026-10-04", settings, NOW)).toEqual([]);
  });

  it("учитывает booking_horizon_days", () => {
    const s = { ...settings, bookingHorizonDays: 3 };
    expect(slotsForDay(calendar(), "2026-10-08", s, NOW)).toHaveLength(4); // сегодня + 3 дня
    expect(slotsForDay(calendar(), "2026-10-09", s, NOW)).toEqual([]);
  });
});

describe("checkStart", () => {
  it("OK для свободного времени", () => {
    expect(checkStart(calendar(), at("11:00"), settings, NOW)).toBe("OK");
  });

  it("SLOT_TAKEN, если пересекается с записью", () => {
    const cal = calendar({ bookings: [{ start: at("11:30"), end: at("12:30") }] });
    expect(checkStart(cal, at("11:00"), settings, NOW)).toBe("SLOT_TAKEN");
  });

  it("OUTSIDE_WORKING_HOURS: до начала, после конца, на обеде, в отпуске", () => {
    expect(checkStart(calendar(), at("09:00"), settings, NOW)).toBe("OUTSIDE_WORKING_HOURS");
    expect(checkStart(calendar(), at("13:30"), settings, NOW)).toBe("OUTSIDE_WORKING_HOURS"); // 13:30+60 > 14:00
    const lunch = calendar({ breaks: new Map([[2, [{ start: 720, end: 780 }]]]) });
    expect(checkStart(lunch, at("12:00"), settings, NOW)).toBe("OUTSIDE_WORKING_HOURS");
    const vacation = calendar({ timeOff: [{ start: at("00:00"), end: at("23:59") }] });
    expect(checkStart(vacation, at("11:00"), settings, NOW)).toBe("OUTSIDE_WORKING_HOURS");
  });

  it("TOO_SOON и TOO_FAR", () => {
    expect(checkStart(calendar(), shopDateTime("2026-10-05", "08:15").getTime(), settings, NOW)).toBe("TOO_SOON");
    expect(checkStart(calendar(), at("11:00", "2026-11-20"), settings, NOW)).toBe("TOO_FAR");
  });

  it("слот не обязан совпадать с сеткой — достаточно, чтобы время было свободно", () => {
    expect(checkStart(calendar(), at("10:20"), settings, NOW)).toBe("OK");
  });
});

describe("«Любой свободный»", () => {
  const a = calendar({ barberId: "a", bookings: [{ start: at("10:00"), end: at("12:00") }] });
  const b = calendar({ barberId: "b", bookings: [{ start: at("12:00"), end: at("13:00") }] });

  it("объединяет слоты всех мастеров", () => {
    const merged = mergeSlots([a, b], DAY, settings, NOW);
    expect([...merged.keys()].map((s) => toShopTime(new Date(s)))).toEqual(["10:00", "11:00", "12:00", "13:00"]);
    expect(merged.get(at("10:00"))).toEqual(["b"]);
    expect(merged.get(at("13:00"))).toEqual(["a", "b"]);
  });

  it("выбирает мастера с меньшей загрузкой", () => {
    expect(pickLeastBusy([a, b], DAY).map((c) => c.barberId)).toEqual(["b", "a"]);
  });
});

describe("canChangeBooking (cutoff отмены)", () => {
  const startsAt = shopDateTime(DAY, "12:00");

  it("можно, если до начала больше лимита", () => {
    expect(canChangeBooking({ status: "confirmed", startsAt }, 30, shopDateTime(DAY, "11:30"))).toBe(true);
  });

  it("нельзя, если до начала меньше лимита", () => {
    expect(canChangeBooking({ status: "confirmed", startsAt }, 30, shopDateTime(DAY, "11:31"))).toBe(false);
  });

  it("нельзя у отменённой или завершённой записи", () => {
    expect(canChangeBooking({ status: "cancelled", startsAt }, 30, NOW)).toBe(false);
    expect(canChangeBooking({ status: "completed", startsAt }, 30, NOW)).toBe(false);
  });
});
