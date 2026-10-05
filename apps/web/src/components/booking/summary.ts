import type { Barber } from "@barbershop/shared";
import { canDoAll } from "@/lib/barber";
import type { Catalog } from "./catalog";
import type { BookingDraft } from "./types";

/** Цена и длительность выбранных услуг у конкретного мастера (с его переопределениями) */
export function totalsForBarber(barber: Barber | undefined, serviceIds: string[], catalog: Catalog) {
  const services = catalog.services
    .filter((s) => serviceIds.includes(s.id))
    .map((s) => {
      const own = barber?.services.find((bs) => bs.serviceId === s.id);
      return { ...s, price: own?.price ?? s.price, durationMin: own?.durationMin ?? s.durationMin };
    });
  return {
    services,
    price: services.reduce((sum, s) => sum + s.price, 0),
    durationMin: services.reduce((sum, s) => sum + s.durationMin, 0),
  };
}

export type Range = { min: number; max: number };

/**
 * Итог выбранного — для показа. Окончательную цену считает сервер.
 * - выбран мастер → его цены и длительность;
 * - «Любой свободный» или мастер ещё не выбран → диапазон «от и до» по всем подходящим мастерам,
 *   потому что у мастеров могут быть свои цены.
 */
export function summarize(draft: BookingDraft, catalog: Catalog) {
  const barber = catalog.barbers.find((b) => b.id === draft.barberId);
  const base = totalsForBarber(barber, draft.serviceIds, catalog);

  let price: Range = { min: base.price, max: base.price };
  let durationMin: Range = { min: base.durationMin, max: base.durationMin };

  if (!barber && draft.serviceIds.length > 0) {
    const options = catalog.barbers
      .filter((b) => canDoAll(b, draft.serviceIds))
      .map((b) => totalsForBarber(b, draft.serviceIds, catalog));
    if (options.length > 0) {
      price = { min: Math.min(...options.map((o) => o.price)), max: Math.max(...options.map((o) => o.price)) };
      durationMin = {
        min: Math.min(...options.map((o) => o.durationMin)),
        max: Math.max(...options.map((o) => o.durationMin)),
      };
    }
  }

  return {
    services: base.services,
    price,
    durationMin,
    barberName: draft.barberId === "any" ? "Любой свободный" : (barber?.name ?? null),
  };
}
