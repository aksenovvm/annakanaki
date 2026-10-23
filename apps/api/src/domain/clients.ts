import type { Prisma, PrismaClient } from "@barbershop/db";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Найти или создать клиента по Telegram-аккаунту — ОДНОЙ атомарной командой PostgreSQL:
 *   INSERT … ON CONFLICT (telegram_id) DO UPDATE …
 *
 * Почему не «найти → создать» и не prisma.upsert: два одновременных запроса (а React в режиме
 * разработки запускает загрузку дважды) оба не находили клиента, оба пытались создать,
 * и второй падал на уникальности telegram_id → 500. ON CONFLICT решает это внутри базы.
 *
 * update = false — только найти/создать (вход в Mini App);
 * update = true  — ещё и обновить имя и телефон из формы записи.
 */
export async function upsertTelegramClient(
  db: Db,
  telegramId: string,
  data: { name: string; phone?: string | null },
  update: boolean,
) {
  const phone = data.phone ?? null;
  const rows = update
    ? await db.$queryRaw<{ id: string }[]>`
        INSERT INTO "clients" ("id", "name", "phone", "telegram_id")
        VALUES (gen_random_uuid(), ${data.name}, ${phone}, ${telegramId})
        ON CONFLICT ("telegram_id") DO UPDATE
          SET "name"  = EXCLUDED."name",
              "phone" = COALESCE(EXCLUDED."phone", "clients"."phone")
        RETURNING "id"`
    : await db.$queryRaw<{ id: string }[]>`
        INSERT INTO "clients" ("id", "name", "phone", "telegram_id")
        VALUES (gen_random_uuid(), ${data.name}, ${phone}, ${telegramId})
        ON CONFLICT ("telegram_id") DO UPDATE SET "telegram_id" = EXCLUDED."telegram_id"
        RETURNING "id"`;
  return db.client.findUniqueOrThrow({ where: { id: rows[0].id } });
}
