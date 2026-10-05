import { formatFullDate } from "@/lib/date";
import { formatDurationRange, formatPriceRange } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { useCatalog } from "./catalog";
import { summarize } from "./summary";
import type { BookingDraft } from "./types";

export function BookingSummary({ draft, showContacts = false }: { draft: BookingDraft; showContacts?: boolean }) {
  const s = summarize(draft, useCatalog());
  const empty = <span className="summary__empty">не выбрано</span>;

  return (
    <dl className="summary">
      <div className="summary__row">
        <dt>Услуги</dt>
        <dd>{s.services.length > 0 ? s.services.map((x) => x.name).join(", ") : empty}</dd>
      </div>
      <div className="summary__row">
        <dt>Барбер</dt>
        <dd>{s.barberName ?? empty}</dd>
      </div>
      <div className="summary__row">
        <dt>Дата и время</dt>
        <dd>{draft.date && draft.time ? `${formatFullDate(draft.date)}, ${draft.time}` : empty}</dd>
      </div>
      {showContacts && (
        <div className="summary__row">
          <dt>Контакты</dt>
          <dd>
            {draft.name}, {formatPhone(draft.phone)}
          </dd>
        </div>
      )}
      <div className="summary__row summary__row--total">
        <dt>Итого</dt>
        <dd>
          {formatPriceRange(s.price)}
          {s.durationMin.max > 0 && <span className="summary__duration"> · {formatDurationRange(s.durationMin)}</span>}
        </dd>
      </div>
      {s.price.min !== s.price.max && (
        <p className="summary__hint">Цена зависит от мастера — точная будет на странице записи.</p>
      )}
    </dl>
  );
}
