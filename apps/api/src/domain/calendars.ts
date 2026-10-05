/**
 * Загрузка из базы всего, что нужно для расчёта свободного времени:
 * выбранные услуги, подходящие мастера, их график, обеды, исключения и записи.
 */
import { addDays, shopDayStart } from "@barbershop/shared";
import { prisma } from "../db";
import { AppError } from "../errors";
import type { BarberCalendar, DayRange } from "./availability";

/** Время из колонки `time` (Prisma отдаёт Date 1970-01-01) → минуты от полуночи */
const minutesOf = (time: Date) => time.getUTCHours() * 60 + time.getUTCMinutes();

/** Услуга так, как её выполнит конкретный мастер (с его ценой и длительностью) */
export type ServiceSnapshot = { serviceId: string; name: string; price: number; durationMin: number };

export type BarberOption = BarberCalendar & {
  barberName: string;
  services: ServiceSnapshot[];
  totalPrice: number;
};

type LoadParams = {
  serviceIds: string[];
  /** id мастера или "any" */
  barberId: string;
  /** Период, за который нужны записи и исключения (даты по Ташкенту, включительно) */
  from: string;
  to: string;
  /** При переносе собственная запись не должна мешать самой себе */
  excludeBookingId?: string;
};

export async function loadBarberOptions({
  serviceIds,
  barberId,
  from,
  to,
  excludeBookingId,
}: LoadParams): Promise<BarberOption[]> {
  // 1. Услуги существуют и активны
  const services = await prisma.service.findMany({ where: { id: { in: serviceIds }, isActive: true } });
  if (services.length !== new Set(serviceIds).size) {
    throw new AppError(422, "SERVICE_NOT_FOUND", "Одна из выбранных услуг недоступна");
  }

  // 2. Мастера: конкретный или все активные
  const barbers = await prisma.barber.findMany({
    where: { isActive: true, ...(barberId === "any" ? {} : { id: barberId }) },
    include: {
      services: { where: { isEnabled: true, serviceId: { in: serviceIds } } },
      workingHours: true,
      breaks: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  if (barberId !== "any" && barbers.length === 0) {
    throw new AppError(422, "BARBER_NOT_FOUND", "Барбер не найден");
  }

  // 3. Оставляем только тех, кто делает ВСЕ выбранные услуги
  const suitable = barbers.filter((b) => b.services.length === serviceIds.length);
  if (barberId !== "any" && suitable.length === 0) {
    throw new AppError(422, "BARBER_CANNOT_PERFORM", "Этот барбер не выполняет выбранные услуги");
  }
  if (suitable.length === 0) return [];

  // 4. Исключения и записи за период — одним запросом на всех мастеров
  const rangeStart = shopDayStart(from);
  const rangeEnd = shopDayStart(addDays(to, 1));
  const ids = suitable.map((b) => b.id);

  const [timeOff, bookings] = await Promise.all([
    prisma.timeOff.findMany({
      where: {
        OR: [{ barberId: { in: ids } }, { barberId: null }], // null — закрыт весь барбершоп
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
    }),
    prisma.booking.findMany({
      where: {
        barberId: { in: ids },
        status: "confirmed",
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      select: { barberId: true, startsAt: true, endsAt: true },
    }),
  ]);

  const byId = new Map(services.map((s) => [s.id, s]));

  // 5. Собираем «календарь» каждого мастера в формате для availability.ts
  return suitable.map((barber) => {
    const snapshots: ServiceSnapshot[] = serviceIds.map((id) => {
      const service = byId.get(id)!;
      const own = barber.services.find((bs) => bs.serviceId === id);
      return {
        serviceId: id,
        name: service.name,
        price: own?.price ?? service.price,
        durationMin: own?.durationMin ?? service.durationMin,
      };
    });

    const breaks = new Map<number, DayRange[]>();
    for (const b of barber.breaks) {
      breaks.set(b.weekday, [...(breaks.get(b.weekday) ?? []), { start: minutesOf(b.startTime), end: minutesOf(b.endTime) }]);
    }

    return {
      barberId: barber.id,
      barberName: barber.name,
      services: snapshots,
      totalPrice: snapshots.reduce((sum, s) => sum + s.price, 0),
      durationMin: snapshots.reduce((sum, s) => sum + s.durationMin, 0),
      workingHours: new Map(barber.workingHours.map((w) => [w.weekday, { start: minutesOf(w.startTime), end: minutesOf(w.endTime) }])),
      breaks,
      timeOff: timeOff
        .filter((t) => t.barberId === null || t.barberId === barber.id)
        .map((t) => ({ start: t.startsAt.getTime(), end: t.endsAt.getTime() })),
      bookings: bookings
        .filter((b) => b.barberId === barber.id)
        .map((b) => ({ start: b.startsAt.getTime(), end: b.endsAt.getTime() })),
    };
  });
}
