import { BookingSummary } from "./BookingSummary";
import type { BookingDraft } from "./types";

export type SubmitError = { code: string; message: string };

type Props = {
  draft: BookingDraft;
  error: SubmitError | null;
  onPickAnotherTime: () => void;
};

/** Ошибки, после которых нужно выбрать другое время */
const TIME_ERRORS = ["SLOT_TAKEN", "TOO_SOON", "TOO_FAR", "OUTSIDE_WORKING_HOURS"];

export function ConfirmStep({ draft, error, onPickAnotherTime }: Props) {
  return (
    <div>
      <h2 className="step__title">Проверьте запись</h2>
      <p className="step__hint">Если всё верно — нажмите «Записаться».</p>

      {error && (
        <div className="alert" role="alert">
          {error.code === "SLOT_TAKEN" ? (
            <p>
              <strong>Это время только что заняли.</strong> Пожалуйста, выберите другое.
            </p>
          ) : (
            <p>{error.message}</p>
          )}
          {TIME_ERRORS.includes(error.code) && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onPickAnotherTime}>
              Выбрать другое время
            </button>
          )}
        </div>
      )}

      <div className="card">
        <BookingSummary draft={draft} showContacts />
      </div>
      <p className="step__footnote">
        После записи откроется её страница — по ссылке на неё можно отменить или перенести визит.
      </p>
    </div>
  );
}
