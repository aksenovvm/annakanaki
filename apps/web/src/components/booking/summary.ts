import type { Catalog } from "./catalog";
import type { BookingDraft } from "./types";

/**
 * Итог выбранного — только для показа. Настоящую цену посчитает backend (этап 5).
 * Если выбран конкретный мастер — берём его цены и длительность (они могут отличаться от базовых).
 */
export function summarize(draft: BookingDraft, catalog: Catalog) {
  const barber = catalog.barbers.find((b) => b.id === draft.barberId);
  const chosen = catalog.services
    .filter((s) => draft.serviceIds.includes(s.id))
    .map((s) => {
      const own = barber?.services.find((bs) => bs.serviceId === s.id);
      return { ...s, price: own?.price ?? s.price, durationMin: own?.durationMin ?? s.durationMin };
    });

  return {
    services: chosen,
    totalPrice: chosen.reduce((sum, s) => sum + s.price, 0),
    totalDurationMin: chosen.reduce((sum, s) => sum + s.durationMin, 0),
    barberName: draft.barberId === "any" ? "Любой свободный" : (barber?.name ?? null),
  };
}
