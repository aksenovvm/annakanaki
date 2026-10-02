const priceFormatter = new Intl.NumberFormat("ru-RU");

/** 150000 → «150 000 сум» */
export function formatPrice(price: number): string {
  return `${priceFormatter.format(price)} сум`;
}

/** 90 → «1 ч 30 мин» */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: "Asia/Tashkent",
});

/** "2026-09-21" → «21 сентября» */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate}T12:00:00Z`));
}

/** Склонение: plural(5, ["год", "года", "лет"]) → «лет» */
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}
