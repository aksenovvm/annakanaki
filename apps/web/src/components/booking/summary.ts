import { barbers, services } from "@/data/mock";
import type { BookingDraft } from "./types";

/** Итог выбранного: на фронте — только для показа. Настоящую цену посчитает backend (этап 5). */
export function summarize(draft: BookingDraft) {
  const chosen = services.filter((s) => draft.serviceIds.includes(s.id));
  const barber = barbers.find((b) => b.id === draft.barberId);
  return {
    services: chosen,
    totalPrice: chosen.reduce((sum, s) => sum + s.price, 0),
    totalDurationMin: chosen.reduce((sum, s) => sum + s.durationMin, 0),
    barberName: draft.barberId === "any" ? "Любой свободный" : barber?.name ?? null,
  };
}
