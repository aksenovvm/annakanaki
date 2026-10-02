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
