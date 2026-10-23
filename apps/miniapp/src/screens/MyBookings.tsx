import { useEffect, useState } from "react";
import { formatMoment } from "@barbershop/shared/format";
import type { Booking } from "@barbershop/shared";
import { api, errorText } from "../api";

export const STATUS_LABELS: Record<Booking["status"], string> = {
  confirmed: "Подтверждена",
  completed: "Визит состоялся",
  cancelled: "Отменена",
  no_show: "Неявка",
};

/** «Мои записи»: предстоящие сверху, прошедшие и отменённые — ниже */
export function MyBookings({ onOpen, onBook }: { onOpen: (b: Booking) => void; onBook: () => void }) {
  const [state, setState] = useState<{ status: "loading" } | { status: "error"; message: string } | { status: "ready"; items: Booking[] }>({
    status: "loading",
  });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    api
      .myBookings()
      .then((items) => !cancelled && setState({ status: "ready", items }))
      .catch((e) => !cancelled && setState({ status: "error", message: errorText(e) }));
    return () => {
      cancelled = true;
    };
  }, [retry]);

  if (state.status === "loading") return <p className="hint center">Загружаем ваши записи…</p>;
  if (state.status === "error")
    return (
      <div className="notice notice--error">
        <p>{state.message}</p>
        <button type="button" className="link" onClick={() => setRetry((k) => k + 1)}>
          Попробовать снова
        </button>
      </div>
    );

  const now = Date.now();
  const upcoming = state.items.filter((b) => b.status === "confirmed" && new Date(b.endsAt).getTime() > now);
  const past = state.items.filter((b) => !upcoming.includes(b)).reverse();

  if (state.items.length === 0) {
    return (
      <div className="empty">
        <p>Записей пока нет.</p>
        <button type="button" className="button-secondary" onClick={onBook}>
          Записаться
        </button>
      </div>
    );
  }

  const row = (b: Booking) => (
    <button key={b.id} type="button" className="row" onClick={() => onOpen(b)}>
      <span className="row__body">
        <span className="row__title capitalize">{formatMoment(b.startsAt)}</span>
        <span className="row__text">
          {b.barber.name} · {b.services.map((s) => s.name).join(", ")}
        </span>
      </span>
      <span className={`badge badge--${b.status}`}>{STATUS_LABELS[b.status]}</span>
    </button>
  );

  return (
    <div className="screen">
      <h1>Мои записи</h1>
      {upcoming.length > 0 ? (
        <div className="list">{upcoming.map(row)}</div>
      ) : (
        <p className="notice">Предстоящих записей нет.</p>
      )}
      {past.length > 0 && (
        <>
          <p className="section-title">История</p>
          <div className="list">{past.map(row)}</div>
        </>
      )}
    </div>
  );
}
