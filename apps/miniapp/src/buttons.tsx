import { useEffect, useRef } from "react";
import { nativeButtons, tg } from "./telegram";

type MainButtonProps = {
  text: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
};

/**
 * Главная кнопка внизу экрана («Далее», «Записаться»).
 * В Telegram — нативная MainButton, вне Telegram — обычная кнопка, прилепленная к низу.
 */
export function MainButton({ text, onClick, disabled = false, loading = false }: MainButtonProps) {
  // Храним последний обработчик в ref, чтобы не переподписываться на каждом рендере
  const handler = useRef(onClick);
  handler.current = onClick;

  useEffect(() => {
    if (!nativeButtons) return;
    const button = tg!.MainButton;
    const click = () => handler.current();
    button.onClick(click);
    button.show();
    return () => {
      button.offClick(click);
      button.hide();
    };
  }, []);

  useEffect(() => {
    if (!nativeButtons) return;
    const button = tg!.MainButton;
    button.setText(text);
    if (disabled) button.disable();
    else button.enable();
    if (loading) button.showProgress(false);
    else button.hideProgress();
  }, [text, disabled, loading]);

  if (nativeButtons) return null;
  return (
    <div className="main-button-bar">
      <button type="button" className="main-button" onClick={onClick} disabled={disabled || loading}>
        {loading ? "Подождите…" : text}
      </button>
    </div>
  );
}

/** Кнопка «Назад»: в Telegram — нативная в шапке, вне Telegram — ссылка над экраном */
export function BackButton({ onClick }: { onClick: () => void }) {
  const handler = useRef(onClick);
  handler.current = onClick;

  useEffect(() => {
    if (!nativeButtons) return;
    const click = () => handler.current();
    tg!.BackButton.onClick(click);
    tg!.BackButton.show();
    return () => {
      tg!.BackButton.offClick(click);
      tg!.BackButton.hide();
    };
  }, []);

  if (nativeButtons) return null;
  return (
    <button type="button" className="back" onClick={onClick}>
      ← Назад
    </button>
  );
}
