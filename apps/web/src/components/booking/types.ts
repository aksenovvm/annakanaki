export type BookingDraft = {
  serviceIds: string[];
  /** id мастера или "any" — «Любой свободный» */
  barberId: string | null;
  date: string | null;
  /** "10:00" по Ташкенту — для показа */
  time: string | null;
  /** То же время в UTC (ISO) — его отправляем на сервер */
  startsAt: string | null;
  name: string;
  phone: string;
};

export const emptyDraft: BookingDraft = {
  serviceIds: [],
  barberId: null,
  date: null,
  time: null,
  startsAt: null,
  name: "",
  phone: "",
};

export const STEPS = ["Услуга", "Барбер", "Дата и время", "Контакты", "Подтверждение"] as const;
