import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  addDays,
  availabilityDaysResponseSchema,
  availabilityResponseSchema,
  isoDateSchema,
  toShopTime,
  todayInShop,
} from "@barbershop/shared";
import { prisma } from "../db";
import { mergeSlots } from "../domain/availability";
import { loadBarberOptions } from "../domain/calendars";
import { loadSettings } from "../domain/settings";

/** ?serviceIds=uuid1,uuid2 → ["uuid1", "uuid2"] */
const serviceIdsParam = z
  .string()
  .transform((value) => value.split(",").map((id) => id.trim()).filter(Boolean))
  .pipe(z.array(z.uuid()).min(1).max(5));

const baseQuery = z.object({
  serviceIds: serviceIdsParam,
  barberId: z.union([z.uuid(), z.literal("any")]),
  /** При переносе: токен переносимой записи — её собственное время считается свободным */
  rescheduleToken: z.string().max(100).optional(),
});

const dayQuery = baseQuery.extend({ date: isoDateSchema });
const daysQuery = baseQuery.extend({
  from: isoDateSchema.optional(),
  days: z.coerce.number().int().min(1).max(60).default(14),
});

async function excludedBookingId(token: string | undefined) {
  if (!token) return undefined;
  const booking = await prisma.booking.findUnique({ where: { manageToken: token }, select: { id: true } });
  return booking?.id;
}

export async function availabilityRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/availability?serviceIds=…&barberId=…|any&date=2026-10-06
   * Свободные времена начала на один день.
   */
  app.get("/availability", async (request) => {
    const query = dayQuery.parse(request.query);
    const [settings, excludeBookingId] = await Promise.all([loadSettings(), excludedBookingId(query.rescheduleToken)]);
    const options = await loadBarberOptions({
      serviceIds: query.serviceIds,
      barberId: query.barberId,
      from: query.date,
      to: query.date,
      excludeBookingId,
    });

    // Для одного мастера это просто его слоты, для «любого» — объединение всех
    const slots = mergeSlots(options, query.date, settings, new Date());
    return availabilityResponseSchema.parse({
      date: query.date,
      slots: [...slots.keys()].map((start) => ({
        startsAt: new Date(start).toISOString(),
        time: toShopTime(new Date(start)),
      })),
    });
  });

  /**
   * GET /api/v1/availability/days?serviceIds=…&barberId=…&from=2026-10-05&days=14
   * Сколько свободных слотов в каждом из ближайших дней — чтобы календарь мог выключить «пустые» дни.
   */
  app.get("/availability/days", async (request) => {
    const query = daysQuery.parse(request.query);
    const from = query.from ?? todayInShop();
    const to = addDays(from, query.days - 1);

    const [settings, excludeBookingId] = await Promise.all([loadSettings(), excludedBookingId(query.rescheduleToken)]);
    const options = await loadBarberOptions({
      serviceIds: query.serviceIds,
      barberId: query.barberId,
      from,
      to,
      excludeBookingId,
    });

    const now = new Date();
    const days = Array.from({ length: query.days }, (_, i) => {
      const date = addDays(from, i);
      return { date, slotsCount: mergeSlots(options, date, settings, now).size };
    });
    return availabilityDaysResponseSchema.parse({ days });
  });
}
