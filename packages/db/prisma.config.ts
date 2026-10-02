import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI (migrate, studio, seed) подключается к базе по DIRECT_URL —
 * прямому подключению к Supabase. Через пулер (DATABASE_URL) миграции не работают.
 * Приложение во время работы использует DATABASE_URL (см. src/index.ts).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? "",
  },
});
