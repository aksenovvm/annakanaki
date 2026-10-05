import { prisma } from "./db";
import { env } from "./env";
import { buildApp } from "./app";

const app = await buildApp();

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`API готов: http://localhost:${env.PORT}/health`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// Аккуратно закрываем соединения с базой при остановке (Ctrl + C)
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}
