import cors from "@fastify/cors";
import Fastify from "fastify";
import { env } from "./env";
import { registerErrorHandlers } from "./errors";
import { availabilityRoutes } from "./routes/availability";
import { barbersRoutes } from "./routes/barbers";
import { bookingsRoutes } from "./routes/bookings";
import { healthRoutes } from "./routes/health";
import { reviewsRoutes } from "./routes/reviews";
import { servicesRoutes } from "./routes/services";

/**
 * Собирает приложение, но не запускает его.
 * Так его можно и запустить как сервер (server.ts), и проверить в тестах, и задеплоить на Vercel.
 */
export async function buildApp() {
  const app = Fastify({
    logger:
      env.NODE_ENV === "development"
        ? { transport: { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } } }
        : env.NODE_ENV !== "test",
  });

  // Какие сайты могут обращаться к API из браузера
  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  });

  registerErrorHandlers(app);

  await app.register(healthRoutes);
  await app.register(
    async (api) => {
      await api.register(servicesRoutes);
      await api.register(barbersRoutes);
      await api.register(reviewsRoutes);
      await api.register(availabilityRoutes);
      await api.register(bookingsRoutes);
    },
    { prefix: "/api/v1" },
  );

  return app;
}
