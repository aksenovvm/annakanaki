/**
 * Общий «договор» между backend и frontend: как выглядят ответы API.
 * Сервер проверяет по этим схемам то, что отдаёт, а сайт берёт отсюда TypeScript-типы.
 */
import { z } from "zod";
import { isValidIsoDate } from "./time";

export * from "./time";

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

// ---------- Свободное время ----------

export const isoDateSchema = z.string().refine(isValidIsoDate, "Дата должна быть в формате YYYY-MM-DD");

export const slotSchema = z.object({
  /** Начало в UTC (ISO) — именно его отправляем обратно при создании записи */
  startsAt: z.iso.datetime(),
  /** То же время по Ташкенту для показа: "10:00" */
  time: z.string(),
});
export type Slot = z.infer<typeof slotSchema>;

export const availabilityResponseSchema = z.object({
  date: z.string(),
  slots: z.array(slotSchema),
});
export type AvailabilityResponse = z.infer<typeof availabilityResponseSchema>;

export const availabilityDaysResponseSchema = z.object({
  days: z.array(z.object({ date: z.string(), slotsCount: z.number().int().nonnegative() })),
});
export type AvailabilityDaysResponse = z.infer<typeof availabilityDaysResponseSchema>;

// ---------- Записи ----------

export const bookingStatusSchema = z.enum(["confirmed", "completed", "cancelled", "no_show"]);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

/** Телефон Узбекистана в формате +998XXXXXXXXX */
export const phoneSchema = z.string().regex(/^\+998\d{9}$/, "Телефон в формате +998XXXXXXXXX");

export const createBookingRequestSchema = z.object({
  serviceIds: z
    .array(z.uuid())
    .min(1, "Выберите хотя бы одну услугу")
    .max(5)
    .refine((ids) => new Set(ids).size === ids.length, "Услуги не должны повторяться"),
  /** id барбера или "any" — «Любой свободный» */
  barberId: z.union([z.uuid(), z.literal("any")]),
  startsAt: z.iso.datetime({ offset: true }),
  client: z.object({
    name: z.string().trim().min(2, "Имя — минимум 2 символа").max(60),
    phone: phoneSchema,
  }),
});
export type CreateBookingRequest = z.infer<typeof createBookingRequestSchema>;

export const rescheduleRequestSchema = z.object({
  startsAt: z.iso.datetime({ offset: true }),
});
export type RescheduleRequest = z.infer<typeof rescheduleRequestSchema>;

export const bookingSchema = z.object({
  id: z.uuid(),
  manageToken: z.string(),
  status: bookingStatusSchema,
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  totalPrice: z.number().int(),
  totalDurationMin: z.number().int(),
  barber: z.object({ id: z.uuid(), name: z.string() }),
  services: z.array(z.object({ serviceId: z.uuid(), name: z.string(), price: z.number().int(), durationMin: z.number().int() })),
  client: z.object({ name: z.string(), phone: z.string().nullable() }),
  /** Можно ли ещё отменить или перенести (статус и лимит времени до начала) */
  canChange: z.boolean(),
  /** До скольки минут до начала разрешено отменять/переносить */
  cancelCutoffMin: z.number().int(),
});
export type Booking = z.infer<typeof bookingSchema>;

/** Коды ошибок, на которые интерфейс реагирует особо */
export const BOOKING_ERROR_CODES = [
  "SLOT_TAKEN",
  "OUTSIDE_WORKING_HOURS",
  "TOO_SOON",
  "TOO_FAR",
  "TOO_LATE_TO_CHANGE",
  "BOOKING_NOT_ACTIVE",
] as const;
