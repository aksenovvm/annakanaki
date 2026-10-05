import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { timeToString, type Prisma } from "@barbershop/db";
import { barberDetailsSchema, barberSchema, listOf, type Barber } from "@barbershop/shared";
import { prisma } from "../db";
import { AppError } from "../errors";

/** Что подгружаем вместе с барбером: только включённые и активные услуги */
const barberInclude = {
  services: {
    where: { isEnabled: true, service: { isActive: true } },
    include: { service: true },
    orderBy: { service: { sortOrder: "asc" } },
  },
} satisfies Prisma.BarberInclude;

type BarberWithServices = Prisma.BarberGetPayload<{ include: typeof barberInclude }>;
type RatingStats = Map<string, { rating: number; count: number }>;

/** Средняя оценка и число отзывов по каждому барберу — одним запросом */
async function loadRatings(barberIds: string[]): Promise<RatingStats> {
  const rows = await prisma.review.groupBy({
    by: ["barberId"],
    where: { barberId: { in: barberIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(
    rows.map((r) => [r.barberId, { rating: Math.round((r._avg.rating ?? 0) * 10) / 10, count: r._count._all }]),
  );
}

/** Строка из БД → объект для API. telegramChatId и прочие служебные поля наружу не отдаём. */
function toBarberDto(barber: BarberWithServices, ratings: RatingStats): Barber {
  const stats = ratings.get(barber.id);
  return {
    id: barber.id,
    name: barber.name,
    role: barber.role,
    photoUrl: barber.photoUrl,
    bio: barber.bio,
    experienceYears: barber.experienceYears,
    specialties: barber.specialties,
    rating: stats?.rating ?? null,
    reviewsCount: stats?.count ?? 0,
    // Если у мастера своя цена или длительность — берём её, иначе — из общей услуги
    services: barber.services.map((bs) => ({
      serviceId: bs.serviceId,
      price: bs.price ?? bs.service.price,
      durationMin: bs.durationMin ?? bs.service.durationMin,
    })),
  };
}

const listResponse = listOf(barberSchema);
const paramsSchema = z.object({ id: z.uuid() });

export async function barbersRoutes(app: FastifyInstance) {
  /** GET /api/v1/barbers — активные барберы */
  app.get("/barbers", async () => {
    const barbers = await prisma.barber.findMany({
      where: { isActive: true },
      include: barberInclude,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    const ratings = await loadRatings(barbers.map((b) => b.id));
    return listResponse.parse({ items: barbers.map((b) => toBarberDto(b, ratings)) });
  });

  /** GET /api/v1/barbers/:id — один барбер: портфолио и недельный график */
  app.get("/barbers/:id", async (request) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      throw new AppError(404, "BARBER_NOT_FOUND", "Барбер не найден");
    }

    const barber = await prisma.barber.findFirst({
      where: { id: params.data.id, isActive: true },
      include: {
        ...barberInclude,
        portfolio: { orderBy: { sortOrder: "asc" } },
        workingHours: { orderBy: { weekday: "asc" } },
        breaks: { orderBy: { startTime: "asc" } },
      },
    });
    if (!barber) {
      throw new AppError(404, "BARBER_NOT_FOUND", "Барбер не найден");
    }

    const ratings = await loadRatings([barber.id]);
    return barberDetailsSchema.parse({
      ...toBarberDto(barber, ratings),
      portfolio: barber.portfolio.map((p) => ({ id: p.id, imageUrl: p.imageUrl })),
      schedule: barber.workingHours.map((wh) => ({
        weekday: wh.weekday,
        start: timeToString(wh.startTime),
        end: timeToString(wh.endTime),
        breaks: barber.breaks
          .filter((b) => b.weekday === wh.weekday)
          .map((b) => ({ start: timeToString(b.startTime), end: timeToString(b.endTime) })),
      })),
    });
  });
}
