/**
 * Обёртка над Telegram Mini Apps API (window.Telegram.WebApp из telegram-web-app.js).
 * Документация: https://core.telegram.org/bots/webapps
 *
 * Описаны только те части, которыми пользуемся. Вне Telegram (в обычном браузере) объекта нет —
 * тогда функции тихо ничего не делают, а кнопки рисуются прямо на странице.
 */

type BottomButton = {
  setText(text: string): void;
  show(): void;
  hide(): void;
  enable(): void;
  disable(): void;
  showProgress(leaveActive?: boolean): void;
  hideProgress(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
};

export type ThemeParams = Partial<
  Record<
    | "bg_color"
    | "text_color"
    | "hint_color"
    | "link_color"
    | "button_color"
    | "button_text_color"
    | "secondary_bg_color"
    | "section_bg_color"
    | "destructive_text_color",
    string
  >
>;

type WebApp = {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name: string; last_name?: string; username?: string } };
  version: string;
  platform: string;
  colorScheme: "light" | "dark";
  themeParams: ThemeParams;
  isVersionAtLeast(version: string): boolean;
  ready(): void;
  expand(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  onEvent(event: "themeChanged", cb: () => void): void;
  showConfirm(message: string, cb: (ok: boolean) => void): void;
  MainButton: BottomButton;
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  HapticFeedback: {
    selectionChanged(): void;
    notificationOccurred(type: "success" | "error" | "warning"): void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp };
  }
}

export const tg: WebApp | undefined = window.Telegram?.WebApp;

/** Приложение открыто внутри Telegram (а не просто в браузере) */
export const insideTelegram = Boolean(tg?.initData);

const supports = (version: string) => Boolean(tg?.isVersionAtLeast?.(version));

/** Нативные кнопки Telegram (MainButton, BackButton) — с версии 6.1 */
export const nativeButtons = insideTelegram && supports("6.1");

/**
 * Подписанная строка initData. В Telegram — настоящая; в браузере при разработке —
 * тестовая из .env.local (npm run tg:dev-init-data). Сервер проверяет подпись в обоих случаях.
 */
export function getInitData(): string | null {
  if (tg?.initData) return tg.initData;
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_INIT_DATA) return import.meta.env.VITE_DEV_INIT_DATA;
  return null;
}

/** Переносим цвета темы Telegram в CSS-переменные приложения */
function applyTheme() {
  const root = document.documentElement;
  const theme = tg?.themeParams ?? {};
  const map: [keyof ThemeParams, string][] = [
    ["bg_color", "--bg"],
    ["secondary_bg_color", "--bg-secondary"],
    ["section_bg_color", "--bg-section"],
    ["text_color", "--text"],
    ["hint_color", "--hint"],
    ["link_color", "--link"],
    ["button_color", "--button"],
    ["button_text_color", "--button-text"],
    ["destructive_text_color", "--danger"],
  ];
  for (const [key, cssVar] of map) {
    const value = theme[key];
    if (value) root.style.setProperty(cssVar, value);
  }
  root.dataset.scheme = tg?.colorScheme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

/** Вызывается один раз при запуске */
export function initTelegram() {
  applyTheme();
  if (!tg) return;
  tg.ready(); // скрывает заставку Telegram
  tg.expand(); // на весь экран
  if (supports("6.1")) {
    tg.setHeaderColor("bg_color");
    tg.setBackgroundColor("bg_color");
  }
  tg.onEvent("themeChanged", applyTheme); // пользователь сменил тему Telegram
}

export const haptic = {
  select: () => insideTelegram && supports("6.1") && tg!.HapticFeedback.selectionChanged(),
  success: () => insideTelegram && supports("6.1") && tg!.HapticFeedback.notificationOccurred("success"),
  error: () => insideTelegram && supports("6.1") && tg!.HapticFeedback.notificationOccurred("error"),
};

/** Подтверждение: нативный диалог Telegram или обычный confirm в браузере */
export function confirmDialog(message: string): Promise<boolean> {
  if (insideTelegram && supports("6.2")) {
    return new Promise((resolve) => tg!.showConfirm(message, resolve));
  }
  return Promise.resolve(window.confirm(message));
}
