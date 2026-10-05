/**
 * Общий «договор» между backend и frontend: как выглядят ответы API.
 * Сервер проверяет по этим схемам то, что отдаёт, а сайт берёт отсюда TypeScript-типы.
 */
import { z } from "zod";

export const serviceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  durationMin: z.number().int().positive(),
  /** Цена в сумах */
  price: z.number().int().nonnegative(),
});
export type Service = z.infer<typeof serviceSchema>;

/** Услуга у конкретного мастера — с его ценой и длительностью (если переопределены) */
export const barberServiceSchema = z.object({
  serviceId: z.uuid(),
  price: z.number().int().nonnegative(),
  durationMin: z.number().int().positive(),
});
export type BarberService = z.infer<typeof barberServiceSchema>;

export const barberSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  role: z.string(),
  photoUrl: z.string().nullable(),
  bio: z.string(),
  experienceYears: z.number().int().nonnegative(),
  specialties: z.array(z.string()),
  /** Средняя оценка из отзывов; null — отзывов ещё нет */
  rating: z.number().nullable(),
  reviewsCount: z.number().int().nonnegative(),
  services: z.array(barberServiceSchema),
});
export type Barber = z.infer<typeof barberSchema>;

export const workingDaySchema = z.object({
  /** 1 = пн … 7 = вс */
  weekday: z.number().int().min(1).max(7),
  start: z.string(),
  end: z.string(),
  breaks: z.array(z.object({ start: z.string(), end: z.string() })),
});

export const barberDetailsSchema = barberSchema.extend({
  portfolio: z.array(z.object({ id: z.uuid(), imageUrl: z.string() })),
  schedule: z.array(workingDaySchema),
});
export type BarberDetails = z.infer<typeof barberDetailsSchema>;

export const publicReviewSchema = z.object({
  id: z.uuid(),
  clientName: z.string(),
  barberName: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: z.iso.datetime(),
});
export type PublicReview = z.infer<typeof publicReviewSchema>;

/** Ответы-списки всегда завёрнуты в { items: [...] } — так их проще расширять (пагинация и т.п.) */
export const listOf = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item) });

export type ListResponse<T> = { items: T[] };

/** Формат ошибки API */
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
