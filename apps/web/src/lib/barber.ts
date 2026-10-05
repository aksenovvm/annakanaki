import type { Barber } from "@barbershop/shared";

const PALETTE = ["#c2853d", "#4f7a6b", "#6b5b95", "#3d6ea8", "#a8553d", "#3d8a8a"];

/** Цвет-заглушка вместо фото: всегда один и тот же для одного барбера */
export function barberAccent(barberId: string): string {
  let hash = 0;
  for (const ch of barberId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/** Делает ли мастер все выбранные услуги */
export function canDoAll(barber: Barber, serviceIds: string[]): boolean {
  return serviceIds.every((id) => barber.services.some((s) => s.serviceId === id));
}
