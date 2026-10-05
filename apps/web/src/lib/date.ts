/**
 * Форматирование дат для показа людям. Базовые функции времени — общие с сервером, из @barbershop/shared.
 * «Дата» — календарный день в Ташкенте в формате YYYY-MM-DD.
 */
import { addDays, toShopDate, toShopTime, todayInShop } from "@barbershop/shared";

export { addDays, todayInShop };

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

/** Момент из API (ISO, UTC) → «вторник, 7 октября, 10:00» по Ташкенту */
export function formatMoment(iso: string): string {
  const moment = new Date(iso);
  return `${formatFullDate(toShopDate(moment))}, ${toShopTime(moment)}`;
}
