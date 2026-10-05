import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { listOf, publicReviewSchema } from "@barbershop/shared";
import { prisma } from "../db";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(6),
});
const responseSchema = listOf(publicReviewSchema);

/** GET /api/v1/reviews/public — опубликованные отзывы для сайта */
export async function reviewsRoutes(app: FastifyInstance) {
  app.get("/reviews/public", async (request) => {
    // Неверный ?limit= → ZodError → 400 VALIDATION_ERROR (см. errors.ts)
    const { limit } = querySchema.parse(request.query);

    const reviews = await prisma.review.findMany({
      where: { isPublic: true },
      include: { client: true, barber: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return responseSchema.parse({
      items: reviews.map((r) => ({
        id: r.id,
        // Публично показываем только имя, без телефона и фамилии
        clientName: r.client.name.split(" ")[0],
        barberName: r.barber.name,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  });
}
