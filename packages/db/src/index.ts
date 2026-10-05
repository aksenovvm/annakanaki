import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export * from "./generated/prisma/client";

/**
 * Создаёт Prisma Client. В приложении (API) подключаемся через пулер — DATABASE_URL.
 * Один клиент на процесс: создавайте его один раз и переиспользуйте.
 */
export function createPrismaClient(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL не задан. Скопируйте .env.example в .env и заполните.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** Время из колонки `time` (Prisma отдаёт его как Date 1970-01-01) → "10:00" */
export function timeToString(value: Date): string {
  return value.toISOString().slice(11, 16);
}

/** "10:00" → значение для колонки `time` */
export function timeFromString(value: string): Date {
  return new Date(`1970-01-01T${value}:00Z`);
}

/** Код ошибки PostgreSQL из ошибки Prisma (через адаптер pg), например "23P01" */
export function pgErrorCode(error: unknown): string | undefined {
  const cause = (error as { meta?: { driverAdapterError?: { cause?: { originalCode?: string; code?: string } } } })?.meta
    ?.driverAdapterError?.cause;
  if (cause?.originalCode) return cause.originalCode;
  if (cause?.code) return cause.code;
  // запасной вариант — по тексту ошибки: "... Code: `23P01` ..."
  const match = error instanceof Error ? /Code: `(\w{5})`/.exec(error.message) : null;
  return match?.[1];
}

/**
 * Это ошибка ограничения bookings_no_overlap? (PostgreSQL код 23P01 — exclusion_violation)
 * Значит, кто-то успел занять пересекающееся время — API ответит 409 SLOT_TAKEN.
 */
export function isOverlapError(error: unknown): boolean {
  return pgErrorCode(error) === "23P01";
}

/**
 * Временная ошибка из-за одновременных запросов — транзакцию нужно просто повторить:
 * - 40P01 deadlock_detected: две записи на одно время проверяли друг друга и «зависли» —
 *   PostgreSQL прервал одну из них;
 * - 40001 serialization_failure.
 */
export function isRetryableError(error: unknown): boolean {
  const code = pgErrorCode(error);
  return code === "40P01" || code === "40001";
}

/**
 * Выполняет действие с базой и повторяет его при временной ошибке (до `attempts` раз).
 * Так советует документация PostgreSQL для одновременных изменений.
 */
export async function withRetry<T>(action: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await action();
    } catch (error) {
      if (attempt >= attempts || !isRetryableError(error)) throw error;
      // небольшая случайная пауза, чтобы повторы не столкнулись снова
      await new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 80));
    }
  }
}
