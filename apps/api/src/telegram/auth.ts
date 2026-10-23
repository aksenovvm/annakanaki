import type { FastifyRequest } from "fastify";
import { env } from "../env";
import { AppError } from "../errors";
import { validateInitData, type TelegramUser } from "./initData";

/**
 * Mini App отправляет initData в заголовке:  Authorization: tma <initData>
 * (такой формат рекомендует документация Telegram Mini Apps).
 */
function readInitData(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("tma ")) return null;
  return header.slice(4).trim();
}

/**
 * Пользователь Telegram из запроса — только если подпись initData верна.
 * null — запрос пришёл не из Mini App (например, с сайта).
 */
export function telegramUserFromRequest(request: FastifyRequest): TelegramUser | null {
  const initData = readInitData(request);
  if (initData === null) return null;

  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new AppError(503, "TELEGRAM_NOT_CONFIGURED", "Вход через Telegram не настроен: на сервере нет TELEGRAM_BOT_TOKEN");
  }
  const result = validateInitData(initData, env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_INIT_DATA_MAX_AGE_SEC);
  if (!result.ok) {
    request.log.warn({ reason: result.reason }, "Неверный Telegram initData");
    throw new AppError(
      401,
      result.reason === "EXPIRED" ? "TELEGRAM_AUTH_EXPIRED" : "TELEGRAM_AUTH_INVALID",
      result.reason === "EXPIRED"
        ? "Сессия Telegram устарела — закройте и снова откройте приложение"
        : "Не удалось проверить вход через Telegram",
    );
  }
  return result.user;
}

/** То же, но вход через Telegram обязателен */
export function requireTelegramUser(request: FastifyRequest): TelegramUser {
  const user = telegramUserFromRequest(request);
  if (!user) throw new AppError(401, "TELEGRAM_AUTH_REQUIRED", "Откройте приложение через Telegram");
  return user;
}

/** Имя для карточки клиента: «Иван Петров» */
export function telegramDisplayName(user: TelegramUser): string {
  return [user.first_name, user.last_name].filter(Boolean).join(" ").trim().slice(0, 60) || "Гость";
}
