/**
 * Для разработки Mini App в обычном браузере (без Telegram).
 *
 * Telegram передаёт приложению подписанную строку initData. В браузере её нет, поэтому этот скрипт
 * подписывает тестовую строку ВАШИМ токеном бота (из apps/api/.env) — ровно так, как это делает Telegram.
 * Сервер проверяет её по-настоящему, никаких «обходов» проверки нет.
 *
 * Запуск: npm run tg:dev-init-data
 * Строка действует TELEGRAM_INIT_DATA_MAX_AGE_SEC (по умолчанию сутки), потом запустите скрипт снова.
 */
import "dotenv/config";
import { signInitData } from "../src/telegram/initData";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("❌ В apps/api/.env нет TELEGRAM_BOT_TOKEN — см. docs/telegram-miniapp.md, шаг 1.");
  process.exit(1);
}

const initData = signInitData(
  {
    query_id: "dev",
    user: JSON.stringify({ id: 100000001, first_name: "Тестовый", last_name: "Клиент", username: "dev_user", language_code: "ru" }),
    auth_date: String(Math.floor(Date.now() / 1000)),
  },
  token,
);

console.log("\nСкопируйте строку ниже в файл apps/miniapp/.env.local:\n");
console.log(`VITE_DEV_INIT_DATA="${initData}"\n`);
