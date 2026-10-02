"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  dayOfMonth,
  formatDayMonth,
  formatFullDate,
  formatWeekdayShort,
  relativeDayLabel,
  upcomingDays,
} from "@/lib/date";
import { getAvailableSlots, type Simulate } from "@/lib/mockApi";
import { EmptyState, ErrorState, LoadingSlots } from "./StatusViews";

const DAYS_AHEAD = 14;

type Props = {
  serviceIds: string[];
  barberId: string;
  date: string | null;
  time: string | null;
  simulate: Simulate;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
};

type SlotsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; slots: string[] };

export function DateTimeStep({ serviceIds, barberId, date, time, simulate, onDateChange, onTimeChange }: Props) {
  const days = useMemo(() => upcomingDays(DAYS_AHEAD), []);
  const selectedDate = date ?? days[0];
  const [slots, setSlots] = useState<SlotsState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  // Если дата ещё не выбрана — сразу выбираем сегодняшнюю.
  useEffect(() => {
    if (!date) onDateChange(days[0]);
  }, [date, days, onDateChange]);

  useEffect(() => {
    let cancelled = false;
    setSlots({ status: "loading" });
    getAvailableSlots({ date: selectedDate, barberId, serviceIds, simulate })
      .then((result) => !cancelled && setSlots({ status: "ready", slots: result }))
      .catch((e: Error) => !cancelled && setSlots({ status: "error", message: e.message }));
    // Если пользователь быстро переключил дату, ответ от старого запроса игнорируем.
    return () => {
      cancelled = true;
    };
  }, [selectedDate, barberId, serviceIds, simulate, reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  const nextDay = days[days.indexOf(selectedDate) + 1];

  return (
    <div>
      <h2 className="step__title">Выберите дату и время</h2>

      <div className="days" role="listbox" aria-label="Дата">
        {days.map((d) => {
          const isSelected = d === selectedDate;
          return (
            <button
              key={d}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-label={formatFullDate(d)}
              className="day"
              onClick={() => onDateChange(d)}
            >
              <span className="day__weekday">{relativeDayLabel(d) ?? formatWeekdayShort(d)}</span>
              <span className="day__number">{dayOfMonth(d)}</span>
              <span className="day__month">{formatDayMonth(d).split(" ")[1]}</span>
            </button>
          );
        })}
      </div>

      <p className="step__subtitle">{formatFullDate(selectedDate)}</p>

      {slots.status === "loading" && <LoadingSlots />}

      {slots.status === "error" && <ErrorState text={slots.message} onRetry={retry} />}

      {slots.status === "ready" && slots.slots.length === 0 && (
        <EmptyState
          title="На этот день всё занято"
          text="Попробуйте другой день или другого мастера."
          action={
            nextDay && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDateChange(nextDay)}>
                Показать следующий день
              </button>
            )
          }
        />
      )}

      {slots.status === "ready" && slots.slots.length > 0 && (
        <div className="slots" role="listbox" aria-label="Время">
          {slots.slots.map((t) => (
            <button
              key={t}
              type="button"
              role="option"
              aria-selected={t === time}
              className="slot"
              onClick={() => onTimeChange(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
