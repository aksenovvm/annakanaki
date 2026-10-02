export type BookingDraft = {
  serviceIds: string[];
  /** id мастера или "any" — «Любой свободный» */
  barberId: string | null;
  date: string | null;
  time: string | null;
  name: string;
  phone: string;
};

export const emptyDraft: BookingDraft = {
  serviceIds: [],
  barberId: null,
  date: null,
  time: null,
  name: "",
  phone: "",
};

export const STEPS = ["Услуга", "Барбер", "Дата и время", "Контакты", "Подтверждение"] as const;
