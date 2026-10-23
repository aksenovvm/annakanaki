import type { Barber, Service } from "@barbershop/shared";

export type Catalog = { services: Service[]; barbers: Barber[] };

/** Делает ли мастер все выбранные услуги */
export const canDoAll = (barber: Barber, serviceIds: string[]) =>
  serviceIds.every((id) => barber.services.some((s) => s.serviceId === id));

/** Цена и длительность выбранных услуг у мастера (у него могут быть свои цены) */
export function totalsFor(barber: Barber | undefined, serviceIds: string[], catalog: Catalog) {
  let price = 0;
  let durationMin = 0;
  for (const service of catalog.services.filter((s) => serviceIds.includes(s.id))) {
    const own = barber?.services.find((bs) => bs.serviceId === service.id);
    price += own?.price ?? service.price;
    durationMin += own?.durationMin ?? service.durationMin;
  }
  return { price, durationMin };
}

/** Диапазон цен по всем подходящим мастерам — для «Любой свободный» */
export function priceRange(serviceIds: string[], catalog: Catalog) {
  const prices = catalog.barbers
    .filter((b) => canDoAll(b, serviceIds))
    .map((b) => totalsFor(b, serviceIds, catalog).price);
  if (prices.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
