import type { FastifyInstance } from "fastify";
import { listOf, bookingSchema, meResponseSchema } from "@barbershop/shared";
import { prisma } from "../db";
import { loadSettings } from "../domain/settings";
import { requireTelegramUser, telegramDisplayName } from "../telegram/auth";
import { bookingInclude, toBookingDto } from "./bookings";

const HISTORY_DAYS = 60;

export async function meRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/me — кто я. Mini App вызывает при запуске: так сервер проверяет initData
   * и находит (или создаёт) клиента, привязанного к Telegram-аккаунту.
   */
  app.get("/me", async (request) => {
    const user = requireTelegramUser(request);
    const telegramId = String(user.id);
    const client =
      (await prisma.client.findUnique({ where: { telegramId } })) ??
      (await prisma.client.create({ data: { telegramId, name: telegramDisplayName(user) } }));

    return meResponseSchema.parse({
      client: { id: client.id, name: client.name, phone: client.phone },
      telegram: { id: user.id, firstName: user.first_name, username: user.username ?? null },
    });
  });

  /** GET /api/v1/me/bookings — мои записи: предстоящие и за последние 60 дней */
  app.get("/me/bookings", async (request) => {
    const user = requireTelegramUser(request);
    const client = await prisma.client.findUnique({ where: { telegramId: String(user.id) } });
    if (!client) return { items: [] };

    const [bookings, settings] = await Promise.all([
      prisma.booking.findMany({
        where: { clientId: client.id, startsAt: { gte: new Date(Date.now() - HISTORY_DAYS * 86_400_000) } },
        include: bookingInclude,
        orderBy: { startsAt: "asc" },
        take: 100,
      }),
      loadSettings(),
    ]);
    const now = new Date();
    return listOf(bookingSchema).parse({ items: bookings.map((b) => toBookingDto(b, settings, now)) });
  });
}
