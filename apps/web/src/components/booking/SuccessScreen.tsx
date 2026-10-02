import Link from "next/link";
import { BookingSummary } from "./BookingSummary";
import type { BookingDraft } from "./types";
import { CheckIcon } from "../Icons";

export function SuccessScreen({ draft, onBookAgain }: { draft: BookingDraft; onBookAgain: () => void }) {
  return (
    <div className="success">
      <div className="success__icon" aria-hidden="true">
        <CheckIcon size={36} />
      </div>
      <h1 className="step__title">Вы записаны!</h1>
      <p className="step__hint">
        Ждём вас{draft.name ? `, ${draft.name.trim()}` : ""}. Мы позвоним, если что-то изменится.
      </p>
      <div className="card success__card">
        <BookingSummary draft={draft} showContacts />
      </div>
      <p className="step__footnote">
        Это демонстрационная запись: на этапе 2 данные никуда не сохраняются.
      </p>
      <div className="success__actions">
        <Link href="/" className="btn btn--primary">
          На главную
        </Link>
        <button type="button" className="btn btn--ghost" onClick={onBookAgain}>
          Записаться ещё
        </button>
      </div>
    </div>
  );
}
