/**
 * Форматирование для людей (русский язык, время Ташкента) — общее для сайта и Mini App.
 */
import { addDays, toShopDate, toShopTime, todayInShop } from "./time";

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

/** 150000–180000 → «150 000 – 180 000 сум», одинаковые → «150 000 сум» */
export function formatPriceRange({ min, max }: { min: number; max: number }): string {
  if (min === max) return formatPrice(min);
  return `${priceFormatter.format(min)} – ${formatPrice(max)}`;
}

/** 60–90 → «1 ч – 1 ч 30 мин» */
export function formatDurationRange({ min, max }: { min: number; max: number }): string {
  if (min === max) return formatDuration(min);
  return `${formatDuration(min)} – ${formatDuration(max)}`;
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

/** Момент из API (ISO, UTC) → «вторник, 7 октября, 10:00» по Ташкенту */
export function formatMoment(iso: string): string {
  const moment = new Date(iso);
  return `${formatFullDate(toShopDate(moment))}, ${toShopTime(moment)}`;
}
