import type { FastifyInstance } from "fastify";
import { listOf, serviceSchema } from "@barbershop/shared";
import { prisma } from "../db";

const responseSchema = listOf(serviceSchema);

/** GET /api/v1/services — активные услуги */
export async function servicesRoutes(app: FastifyInstance) {
  app.get("/services", async () => {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    // Отдаём только то, что нужно сайту, — и проверяем ответ по общей схеме
    return responseSchema.parse({
      items: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        durationMin: s.durationMin,
        price: s.price,
      })),
    });
  });
}
