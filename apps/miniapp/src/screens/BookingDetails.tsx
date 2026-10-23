import { useCallback, useRef, useState } from "react";
import { formatDuration, formatMoment, formatPrice } from "@barbershop/shared/format";
import type { Booking, Slot } from "@barbershop/shared";
import { ApiError, api, errorText } from "../api";
import { BackButton, MainButton } from "../buttons";
import { confirmDialog, haptic } from "../telegram";
import { DateTimePicker } from "./DateTimePicker";
import { STATUS_LABELS } from "./MyBookings";

type Props = {
  booking: Booking;
  justCreated?: boolean;
  onBack: () => void;
  onChanged: (b: Booking) => void;
};

/** Карточка записи: детали, перенос и отмена (те же /bookings/:token/…, что и на сайте) */
export function BookingDetails({ booking, justCreated = false, onBack, onChanged }: Props) {
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(justCreated ? "Вы записаны! Ждём вас." : null);
  const [refreshKey, setRefreshKey] = useState(0);
  const busyRef = useRef(false);

  const onDate = useCallback((d: string) => (setDate(d), setSlot(null)), []);

  async function run(action: () => Promise<Booking>, success: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const updated = await action();
      haptic.success();
      onChanged(updated);
      setMode("view");
      setSlot(null);
      setNotice(success);
    } catch (e) {
      haptic.error();
      setError(errorText(e));
      if (e instanceof ApiError && e.code === "SLOT_TAKEN") {
        setSlot(null);
        setRefreshKey((k) => k + 1);
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function cancel() {
    if (await confirmDialog("Отменить запись?")) {
      await run(() => api.cancel(booking.manageToken), "Запись отменена.");
    }
  }

  const active = booking.status === "confirmed";

  return (
    <div className="screen">
      <BackButton onClick={mode === "reschedule" ? () => (setMode("view"), setError(null)) : onBack} />

      {notice && <p className="notice notice--success">{notice}</p>}
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      {mode === "view" && (
        <>
          <div className="card">
            <span className={`badge badge--${booking.status}`}>{STATUS_LABELS[booking.status]}</span>
            <dl className="summary">
              <dt>Когда</dt>
              <dd className="capitalize">{formatMoment(booking.startsAt)}</dd>
              <dt>Барбер</dt>
              <dd>{booking.barber.name}</dd>
              <dt>Услуги</dt>
              <dd>{booking.services.map((s) => s.name).join(", ")}</dd>
              <dt>Итого</dt>
              <dd>
                <strong>{formatPrice(booking.totalPrice)}</strong> · {formatDuration(booking.totalDurationMin)}
              </dd>
            </dl>
          </div>

          {active && booking.canChange && (
            <div className="actions">
              <button type="button" className="button-secondary" onClick={() => (setMode("reschedule"), setNotice(null))}>
                Перенести
              </button>
              <button type="button" className="button-secondary button-danger" disabled={busy} onClick={cancel}>
                Отменить запись
              </button>
            </div>
          )}
          {active && !booking.canChange && (
            <p className="hint">
              Отменить или перенести онлайн можно не позднее чем за {booking.cancelCutoffMin} мин до начала.
              Если планы изменились — позвоните нам.
            </p>
          )}
        </>
      )}

      {mode === "reschedule" && (
        <>
          <h1>Новое время</h1>
          <DateTimePicker
            serviceIds={booking.services.map((s) => s.serviceId)}
            barberId={booking.barber.id}
            rescheduleToken={booking.manageToken}
            date={date}
            startsAt={slot?.startsAt ?? null}
            onDate={onDate}
            onSlot={setSlot}
            refreshKey={refreshKey}
          />
          <MainButton
            text={slot ? `Перенести на ${slot.time}` : "Выберите время"}
            disabled={!slot}
            loading={busy}
            onClick={() => slot && run(() => api.reschedule(booking.manageToken, slot.startsAt), "Запись перенесена.")}
          />
        </>
      )}
    </div>
  );
}
