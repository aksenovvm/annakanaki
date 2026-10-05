"use client";

import { useEffect, useState } from "react";
import type { Slot } from "@barbershop/shared";
import { ApiError, fetchAvailability, fetchAvailabilityDays } from "@/lib/apiClient";
import { dayOfMonth, formatDayMonth, formatFullDate, formatWeekdayShort, relativeDayLabel } from "@/lib/date";
import { EmptyState, ErrorState, LoadingSlots } from "./StatusViews";

const DAYS_AHEAD = 14;

type Props = {
  serviceIds: string[];
  /** id мастера или "any" */
  barberId: string;
  /** При переносе — токен записи, чтобы её собственное время считалось свободным */
  rescheduleToken?: string;
  date: string | null;
  startsAt: string | null;
  onDateChange: (date: string) => void;
  onSlotChange: (slot: Slot) => void;
  /** Увеличьте, чтобы перезагрузить слоты (например, после SLOT_TAKEN) */
  refreshKey?: number;
  title?: string;
};

type Loadable<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

const errorMessage = (e: unknown) => (e instanceof ApiError ? e.message : "Не удалось загрузить свободное время");

export function DateTimeStep({
  serviceIds,
  barberId,
  rescheduleToken,
  date,
  startsAt,
  onDateChange,
  onSlotChange,
  refreshKey = 0,
  title = "Выберите дату и время",
}: Props) {
  const [days, setDays] = useState<Loadable<{ date: string; slotsCount: number }[]>>({ status: "loading" });
  const [slots, setSlots] = useState<Loadable<Slot[]>>({ status: "loading" });
  const [daysReload, setDaysReload] = useState(0);
  const [slotsReload, setSlotsReload] = useState(0);
  const servicesKey = serviceIds.join(",");

  // 1. Какие из ближайших дней вообще имеют свободное время
  useEffect(() => {
    let cancelled = false;
    setDays({ status: "loading" });
    fetchAvailabilityDays({ serviceIds: servicesKey.split(","), barberId, rescheduleToken, days: DAYS_AHEAD })
      .then((res) => !cancelled && setDays({ status: "ready", data: res.days }))
      .catch((e) => !cancelled && setDays({ status: "error", message: errorMessage(e) }));
    return () => {
      cancelled = true;
    };
  }, [servicesKey, barberId, rescheduleToken, daysReload, refreshKey]);

  // Если дата не выбрана или в выбранный день мест нет — выбираем первый день со свободным временем
  useEffect(() => {
    if (days.status !== "ready") return;
    const current = days.data.find((d) => d.date === date);
    if (current && current.slotsCount > 0) return;
    const firstFree = days.data.find((d) => d.slotsCount > 0);
    if (firstFree) onDateChange(firstFree.date);
  }, [days, date, onDateChange]);

  // 2. Свободное время в выбранный день
  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setSlots({ status: "loading" });
    fetchAvailability({ serviceIds: servicesKey.split(","), barberId, rescheduleToken, date })
      .then((res) => !cancelled && setSlots({ status: "ready", data: res.slots }))
      .catch((e) => !cancelled && setSlots({ status: "error", message: errorMessage(e) }));
    // Если пользователь быстро переключил дату, ответ от старого запроса игнорируем
    return () => {
      cancelled = true;
    };
  }, [servicesKey, barberId, rescheduleToken, date, slotsReload, refreshKey]);

  if (days.status === "loading") {
    return (
      <div>
        <h2 className="step__title">{title}</h2>
        <div className="days" aria-busy="true">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="skeleton day-skeleton" />
          ))}
        </div>
        <LoadingSlots />
      </div>
    );
  }

  if (days.status === "error") {
    return (
      <div>
        <h2 className="step__title">{title}</h2>
        <ErrorState text={days.message} onRetry={() => setDaysReload((k) => k + 1)} />
      </div>
    );
  }

  if (!days.data.some((d) => d.slotsCount > 0)) {
    return (
      <div>
        <h2 className="step__title">{title}</h2>
        <EmptyState
          title="Нет свободного времени в ближайшие две недели"
          text="Попробуйте выбрать другого мастера или вариант «Любой свободный»."
        />
      </div>
    );
  }

  return (
    <div>
      <h2 className="step__title">{title}</h2>

      <div className="days" role="listbox" aria-label="Дата">
        {days.data.map((d) => {
          const isSelected = d.date === date;
          const isFull = d.slotsCount === 0;
          return (
            <button
              key={d.date}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-label={`${formatFullDate(d.date)}${isFull ? ", нет свободного времени" : ""}`}
              className="day"
              disabled={isFull}
              onClick={() => onDateChange(d.date)}
            >
              <span className="day__weekday">{relativeDayLabel(d.date) ?? formatWeekdayShort(d.date)}</span>
              <span className="day__number">{dayOfMonth(d.date)}</span>
              <span className="day__month">{isFull ? "нет мест" : formatDayMonth(d.date).split(" ")[1]}</span>
            </button>
          );
        })}
      </div>

      {date && <p className="step__subtitle">{formatFullDate(date)}</p>}

      {slots.status === "loading" && <LoadingSlots />}

      {slots.status === "error" && <ErrorState text={slots.message} onRetry={() => setSlotsReload((k) => k + 1)} />}

      {slots.status === "ready" && slots.data.length === 0 && (
        <EmptyState title="На этот день всё занято" text="Выберите другой день." />
      )}

      {slots.status === "ready" && slots.data.length > 0 && (
        <div className="slots" role="listbox" aria-label="Время">
          {slots.data.map((slot) => (
            <button
              key={slot.startsAt}
              type="button"
              role="option"
              aria-selected={slot.startsAt === startsAt}
              className="slot"
              onClick={() => onSlotChange(slot)}
            >
              {slot.time}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
