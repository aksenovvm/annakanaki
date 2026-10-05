import { defineConfig } from "vitest/config";

/**
 * Две группы тестов:
 * - unit — быстрые, без базы:            npm test
 * - integration — с настоящей базой из .env: npm run test:integration
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.integration.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.ts"],
          // запросы к облачной базе идут дольше
          testTimeout: 60_000,
          hookTimeout: 60_000,
          // тесты работают с одной базой — по очереди
          fileParallelism: false,
        },
      },
    ],
  },
});
