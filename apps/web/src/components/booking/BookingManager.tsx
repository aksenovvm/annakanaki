"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Booking, Slot } from "@barbershop/shared";
import { shop } from "@/data/shop";
import { ApiError, cancelBooking, fetchBooking, rescheduleBooking } from "@/lib/apiClient";
import { formatMoment } from "@/lib/date";
import { formatDuration, formatPrice } from "@/lib/format";
import { CheckIcon } from "../Icons";
import { DateTimeStep } from "./DateTimeStep";
import { Spinner } from "./StatusViews";

const STATUS_LABELS: Record<Booking["status"], string> = {
  confirmed: "Подтверждена",
  completed: "Визит состоялся",
  cancelled: "Отменена",
  no_show: "Неявка",
};

type Mode = "view" | "confirm-cancel" | "reschedule";

export function BookingManager({ initialBooking, justCreated }: { initialBooking: Booking; justCreated: boolean }) {
  const [booking, setBooking] = useState(initialBooking);
  const [mode, setMode] = useState<Mode>("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Для переноса
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [slotsRefresh, setSlotsRefresh] = useState(0);

  const busyRef = useRef(false);

  async function run(action: () => Promise<Booking>, successText: string) {
    if (busyRef.current) return; // второе нажатие, пока идёт первый запрос
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      setBooking(await action());
      setMode("view");
      setNotice(successText);
      setSlot(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Что-то пошло не так. Попробуйте ещё раз.");
      if (e instanceof ApiError && e.code === "SLOT_TAKEN") {
        setSlot(null);
        setSlotsRefresh((k) => k + 1);
      }
      // Запись изменилась на сервере (уже отменена, или стало поздно) — показываем актуальное состояние
      if (e instanceof ApiError && (e.code === "TOO_LATE_TO_CHANGE" || e.code === "BOOKING_NOT_ACTIVE")) {
        setMode("view");
        fetchBooking(booking.manageToken).then(setBooking, () => undefined);
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href.split("?")[0]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // буфер обмена недоступен — ничего страшного, ссылку можно скопировать из адресной строки
    }
  }

  const isActive = booking.status === "confirmed";

  return (
    <div className="manage">
      {justCreated && isActive && !notice && (
        <div className="success">
          <div className="success__icon" aria-hidden="true">
            <CheckIcon size={36} />
          </div>
          <h1 className="step__title">Вы записаны!</h1>
          <p className="step__hint">Ждём вас, {booking.client.name}.</p>
        </div>
      )}
      {!justCreated && <h1 className="step__title">Ваша запись</h1>}

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <div className="card manage__card">
        <span className={`badge badge--${booking.status}`}>{STATUS_LABELS[booking.status]}</span>
        <dl className="summary">
          <div className="summary__row">
            <dt>Когда</dt>
            <dd>{formatMoment(booking.startsAt)}</dd>
          </div>
          <div className="summary__row">
            <dt>Барбер</dt>
            <dd>{booking.barber.name}</dd>
          </div>
          <div className="summary__row">
            <dt>Услуги</dt>
            <dd>{booking.services.map((s) => s.name).join(", ")}</dd>
          </div>
          <div className="summary__row">
            <dt>Адрес</dt>
            <dd>{shop.address}</dd>
          </div>
          <div className="summary__row summary__row--total">
            <dt>Итого</dt>
            <dd>
              {formatPrice(booking.totalPrice)}
              <span className="summary__duration"> · {formatDuration(booking.totalDurationMin)}</span>
            </dd>
          </div>
        </dl>
      </div>

      {isActive && (
        <div className="manage__link">
          <p>
            <strong>Сохраните эту страницу.</strong> По ссылке можно отменить или перенести запись.
          </p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={copyLink}>
            {copied ? "Скопировано ✓" : "Скопировать ссылку"}
          </button>
        </div>
      )}

      {error && (
        <div className="alert" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* Действия */}
      {isActive && booking.canChange && mode === "view" && (
        <div className="manage__actions">
          <button type="button" className="btn btn--ghost" onClick={() => (setMode("reschedule"), setError(null), setNotice(null))}>
            Перенести
          </button>
          <button type="button" className="btn btn--ghost btn--danger" onClick={() => (setMode("confirm-cancel"), setError(null), setNotice(null))}>
            Отменить запись
          </button>
        </div>
      )}

      {isActive && !booking.canChange && (
        <p className="step__footnote">
          Отменить или перенести запись онлайн можно не позднее чем за {booking.cancelCutoffMin} мин до начала. Если
          планы изменились — позвоните нам: <a href={shop.phoneHref}>{shop.phone}</a>.
        </p>
      )}

      {mode === "confirm-cancel" && (
        <div className="card manage__confirm">
          <p className="state__title">Точно отменить запись?</p>
          <div className="manage__actions">
            <button
              type="button"
              className="btn btn--primary btn--danger-solid"
              disabled={busy}
              onClick={() => run(() => cancelBooking(booking.manageToken), "Запись отменена.")}
            >
              {busy ? <Spinner /> : null} Да, отменить
            </button>
            <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => setMode("view")}>
              Нет, оставить
            </button>
          </div>
        </div>
      )}

      {mode === "reschedule" && (
        <div className="manage__reschedule">
          <DateTimeStep
            title="Новое время"
            serviceIds={booking.services.map((s) => s.serviceId)}
            barberId={booking.barber.id}
            rescheduleToken={booking.manageToken}
            date={date}
            startsAt={slot?.startsAt ?? null}
            refreshKey={slotsRefresh}
            onDateChange={(d) => (setDate(d), setSlot(null))}
            onSlotChange={setSlot}
          />
          <div className="manage__actions">
            <button
              type="button"
              className="btn btn--primary"
              disabled={!slot || busy}
              onClick={() =>
                slot && run(() => rescheduleBooking(booking.manageToken, slot.startsAt), "Запись перенесена.")
              }
            >
              {busy ? <Spinner /> : null}
              {slot ? `Перенести на ${slot.time}` : "Выберите время"}
            </button>
            <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => (setMode("view"), setError(null))}>
              Не переносить
            </button>
          </div>
        </div>
      )}

      <div className="manage__footer">
        <Link href="/" className="btn btn--ghost btn--sm">
          На главную
        </Link>
        {!isActive && (
          <Link href="/book" className="btn btn--primary btn--sm">
            Записаться снова
          </Link>
        )}
      </div>
    </div>
  );
}
