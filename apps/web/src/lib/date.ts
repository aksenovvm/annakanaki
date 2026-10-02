/**
 * Даты в форме записи — это «календарные дни в Ташкенте» в формате YYYY-MM-DD.
 * Ташкент всегда UTC+5 (без перехода на летнее время), поэтому смещение можно задать константой.
 */
export const SHOP_TIMEZONE = "Asia/Tashkent";
const SHOP_UTC_OFFSET = "+05:00";

const isoDayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TIMEZONE });

/** Сегодняшняя дата в Ташкенте: "2026-10-02" */
export function todayInShop(now = new Date()): string {
  return isoDayFormatter.format(now);
}

/** "2026-10-02" + 3 → "2026-10-05" */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Ближайшие `count` дней начиная с сегодняшнего */
export function upcomingDays(count: number, now = new Date()): string[] {
  const today = todayInShop(now);
  return Array.from({ length: count }, (_, i) => addDays(today, i));
}

/** Дата + время по Ташкенту → момент в UTC (так его потом получит API) */
export function toUtcIso(isoDate: string, time: string): string {
  return new Date(`${isoDate}T${time}:00${SHOP_UTC_OFFSET}`).toISOString();
}

const noon = (isoDate: string) => new Date(`${isoDate}T12:00:00Z`);

const weekdayShort = new Intl.DateTimeFormat("ru-RU", { weekday: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** «пт» */
export function formatWeekdayShort(isoDate: string): string {
  return weekdayShort.format(noon(isoDate)).replace(".", "");
}

/** «2» (число месяца) */
export function dayOfMonth(isoDate: string): number {
  return noon(isoDate).getUTCDate();
}

/** «2 окт.» */
export function formatDayMonth(isoDate: string): string {
  return dayMonth.format(noon(isoDate));
}

/** «пятница, 2 октября» */
export function formatFullDate(isoDate: string): string {
  return fullDate.format(noon(isoDate));
}

/** «Сегодня» / «Завтра» / null */
export function relativeDayLabel(isoDate: string, now = new Date()): string | null {
  const today = todayInShop(now);
  if (isoDate === today) return "Сегодня";
  if (isoDate === addDays(today, 1)) return "Завтра";
  return null;
}
