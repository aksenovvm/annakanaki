import { useEffect, useState } from "react";
import { dayOfMonth, formatDayMonth, formatFullDate, formatWeekdayShort, relativeDayLabel } from "@barbershop/shared/format";
import type { Slot } from "@barbershop/shared";
import { api, errorText } from "../api";
import { haptic } from "../telegram";

type Props = {
  serviceIds: string[];
  barberId: string;
  rescheduleToken?: string;
  date: string | null;
  startsAt: string | null;
  onDate: (date: string) => void;
  onSlot: (slot: Slot) => void;
  /** Увеличьте, чтобы перезагрузить (например, после SLOT_TAKEN) */
  refreshKey?: number;
};

type Loadable<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

/** Выбор дня и времени — данные считает сервер (/availability/days и /availability) */
export function DateTimePicker({ serviceIds, barberId, rescheduleToken, date, startsAt, onDate, onSlot, refreshKey = 0 }: Props) {
  const [days, setDays] = useState<Loadable<{ date: string; slotsCount: number }[]>>({ status: "loading" });
  const [slots, setSlots] = useState<Loadable<Slot[]>>({ status: "loading" });
  const [retry, setRetry] = useState(0);
  const key = serviceIds.join(",");

  useEffect(() => {
    let cancelled = false;
    setDays({ status: "loading" });
    api
      .availabilityDays({ serviceIds: key.split(","), barberId, rescheduleToken, days: 14 })
      .then((r) => !cancelled && setDays({ status: "ready", data: r.days }))
      .catch((e) => !cancelled && setDays({ status: "error", message: errorText(e) }));
    return () => {
      cancelled = true;
    };
  }, [key, barberId, rescheduleToken, refreshKey, retry]);

  // Если день не выбран или в нём нет мест — выбираем первый свободный
  useEffect(() => {
    if (days.status !== "ready") return;
    if (days.data.find((d) => d.date === date && d.slotsCount > 0)) return;
    const first = days.data.find((d) => d.slotsCount > 0);
    if (first) onDate(first.date);
  }, [days, date, onDate]);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setSlots({ status: "loading" });
    api
      .availability({ serviceIds: key.split(","), barberId, rescheduleToken, date })
      .then((r) => !cancelled && setSlots({ status: "ready", data: r.slots }))
      .catch((e) => !cancelled && setSlots({ status: "error", message: errorText(e) }));
    return () => {
      cancelled = true;
    };
  }, [key, barberId, rescheduleToken, date, refreshKey, retry]);

  if (days.status === "loading") return <p className="hint center">Загружаем свободное время…</p>;
  if (days.status === "error")
    return (
      <div className="notice notice--error">
        <p>{days.message}</p>
        <button type="button" className="link" onClick={() => setRetry((k) => k + 1)}>
          Попробовать снова
        </button>
      </div>
    );
  if (!days.data.some((d) => d.slotsCount > 0))
    return <p className="notice">Свободного времени в ближайшие две недели нет. Попробуйте другого мастера.</p>;

  return (
    <div>
      <div className="days">
        {days.data.map((d) => (
          <button
            key={d.date}
            type="button"
            className="day"
            aria-pressed={d.date === date}
            disabled={d.slotsCount === 0}
            onClick={() => (haptic.select(), onDate(d.date))}
          >
            <span className="day__weekday">{relativeDayLabel(d.date) ?? formatWeekdayShort(d.date)}</span>
            <span className="day__number">{dayOfMonth(d.date)}</span>
            <span className="day__month">{d.slotsCount === 0 ? "нет мест" : formatDayMonth(d.date).split(" ")[1]}</span>
          </button>
        ))}
      </div>

      {date && <p className="section-title capitalize">{formatFullDate(date)}</p>}

      {slots.status === "loading" && <p className="hint center">Загружаем…</p>}
      {slots.status === "error" && <p className="notice notice--error">{slots.message}</p>}
      {slots.status === "ready" && slots.data.length === 0 && <p className="notice">На этот день всё занято.</p>}
      {slots.status === "ready" && slots.data.length > 0 && (
        <div className="slots">
          {slots.data.map((slot) => (
            <button
              key={slot.startsAt}
              type="button"
              className="slot"
              aria-pressed={slot.startsAt === startsAt}
              onClick={() => (haptic.select(), onSlot(slot))}
            >
              {slot.time}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
