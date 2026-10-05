import "dotenv/config";
import { z } from "zod";

/**
 * Настройки сервера из переменных окружения (файл .env).
 * Проверяем их при старте: лучше сразу упасть с понятной ошибкой, чем потом — с непонятной.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL не задан — скопируйте apps/api/.env.example в apps/api/.env"),
  PORT: z.coerce.number().int().positive().default(4000),
  // "localhost" — Fastify слушает и 127.0.0.1, и ::1 (важно для macOS)
  HOST: z.string().default("localhost"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("\n❌ Ошибка в настройках сервера (apps/api/.env):\n");
  console.error(z.prettifyError(parsed.error));
  console.error();
  process.exit(1);
}

export const env = parsed.data;
