/** Общие UI-состояния: загрузка, пусто, ошибка. */

import type { ReactNode } from "react";

export function LoadingSlots() {
  return (
    <div className="slots" aria-busy="true" aria-label="Загружаем свободное время">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="skeleton slot-skeleton" />
      ))}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="state">
      <div className="state__icon" aria-hidden="true">
        ☕
      </div>
      <p className="state__title">{title}</p>
      <p className="state__text">{text}</p>
      {action}
    </div>
  );
}

export function ErrorState({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <div className="state__icon" aria-hidden="true">
        ⚠️
      </div>
      <p className="state__title">Что-то пошло не так</p>
      <p className="state__text">{text}</p>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
        Попробовать снова
      </button>
    </div>
  );
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}
