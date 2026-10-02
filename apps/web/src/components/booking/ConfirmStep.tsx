import { BookingSummary } from "./BookingSummary";
import type { BookingDraft } from "./types";

type Props = {
  draft: BookingDraft;
  error: "SLOT_TAKEN" | "OTHER" | null;
  onPickAnotherTime: () => void;
};

export function ConfirmStep({ draft, error, onPickAnotherTime }: Props) {
  return (
    <div>
      <h2 className="step__title">Проверьте запись</h2>
      <p className="step__hint">Если всё верно — нажмите «Записаться».</p>

      {error === "SLOT_TAKEN" && (
        <div className="alert" role="alert">
          <p>
            <strong>Это время только что заняли.</strong> Пожалуйста, выберите другое.
          </p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onPickAnotherTime}>
            Выбрать другое время
          </button>
        </div>
      )}
      {error === "OTHER" && (
        <div className="alert" role="alert">
          <p>Не получилось создать запись. Проверьте интернет и попробуйте ещё раз.</p>
        </div>
      )}

      <div className="card">
        <BookingSummary draft={draft} showContacts />
      </div>
      <p className="step__footnote">Отменить или перенести запись можно не позднее чем за 30 минут до начала.</p>
    </div>
  );
}
