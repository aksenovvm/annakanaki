/**
 * Проверка Telegram Mini App initData (docs/spec.md, раздел 10).
 *
 * Когда Telegram открывает Mini App, он передаёт строку initData:
 *   query_id=…&user={"id":123,"first_name":"Иван"}&auth_date=1700000000&hash=ab12…
 * hash — подпись, сделанная ключом нашего бота. Подделать её без токена бота нельзя,
 * поэтому сервер может доверять полю user — но только после проверки подписи.
 *
 * Алгоритм (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app):
 *   1. убрать hash, остальные пары отсортировать по ключу и склеить через "\n" как key=value;
 *   2. secret = HMAC_SHA256(ключ "WebAppData", данные = токен бота);
 *   3. hash должен совпасть с hex(HMAC_SHA256(ключ secret, данные = строка из шага 1));
 *   4. auth_date не должен быть слишком старым.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type InitDataResult =
  | { ok: true; user: TelegramUser; authDate: Date }
  | { ok: false; reason: "MALFORMED" | "BAD_SIGNATURE" | "EXPIRED" | "NO_USER" };

function dataCheckString(params: URLSearchParams): string {
  return [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function signature(params: URLSearchParams, botToken: string): string {
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  return createHmac("sha256", secret).update(dataCheckString(params)).digest("hex");
}

export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSec: number,
  now: Date = new Date(),
): InitDataResult {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDateRaw = Number(params.get("auth_date"));
  if (!hash || !/^[0-9a-f]{64}$/.test(hash) || !Number.isFinite(authDateRaw)) return { ok: false, reason: "MALFORMED" };

  // Сравнение за постоянное время — чтобы по скорости ответа нельзя было подобрать подпись
  const expected = Buffer.from(signature(params, botToken), "hex");
  if (!timingSafeEqual(expected, Buffer.from(hash, "hex"))) return { ok: false, reason: "BAD_SIGNATURE" };

  const authDate = new Date(authDateRaw * 1000);
  if (now.getTime() - authDate.getTime() > maxAgeSec * 1000) return { ok: false, reason: "EXPIRED" };

  try {
    const user = JSON.parse(params.get("user") ?? "null") as TelegramUser | null;
    if (!user || typeof user.id !== "number") return { ok: false, reason: "NO_USER" };
    return { ok: true, user, authDate };
  } catch {
    return { ok: false, reason: "MALFORMED" };
  }
}

/**
 * Подписать initData так же, как это делает Telegram.
 * Нужно для тестов и для разработки в обычном браузере (scripts/dev-init-data.ts).
 */
export function signInitData(fields: Record<string, string>, botToken: string): string {
  const params = new URLSearchParams(fields);
  params.set("hash", signature(params, botToken));
  return params.toString();
}
