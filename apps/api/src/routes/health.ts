import type { FastifyInstance } from "fastify";
import { prisma } from "../db";

/** GET /health — жив ли сервер и есть ли связь с базой */
export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok", db: "ok" };
    } catch (err) {
      request.log.error({ err }, "База данных недоступна");
      return reply.status(503).send({ status: "error", db: "unavailable" });
    }
  });
}
