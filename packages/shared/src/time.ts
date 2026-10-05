/**
 * Время барбершопа. В базе всё хранится в UTC, а люди думают по-ташкентски.
 * Ташкент всегда UTC+5 (без перехода на летнее время), поэтому смещение — константа.
 *
 * «Дата» здесь — календарный день в Ташкенте в формате YYYY-MM-DD.
 * «Время» — "HH:MM" по Ташкенту.
 */
export const SHOP_TIMEZONE = "Asia/Tashkent";
export const SHOP_UTC_OFFSET = "+05:00";
const OFFSET_MS = 5 * 60 * 60_000;

export const MINUTE_MS = 60_000;
export const DAY_MS = 24 * 60 * MINUTE_MS;

/** Сегодняшняя дата в Ташкенте: "2026-10-05" */
export function todayInShop(now: Date = new Date()): string {
  return toShopDate(now);
}

/** Момент времени → дата в Ташкенте */
export function toShopDate(moment: Date): string {
  return new Date(moment.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** Момент времени → "HH:MM" в Ташкенте */
export function toShopTime(moment: Date): string {
  return new Date(moment.getTime() + OFFSET_MS).toISOString().slice(11, 16);
}

/** "2026-10-05" + 3 → "2026-10-08" */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Полночь по Ташкенту для даты → момент в UTC */
export function shopDayStart(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00${SHOP_UTC_OFFSET}`);
}

/** Дата + время по Ташкенту → момент в UTC */
export function shopDateTime(isoDate: string, time: string): Date {
  return new Date(`${isoDate}T${time}:00${SHOP_UTC_OFFSET}`);
}

/** День недели по ISO: 1 = понедельник … 7 = воскресенье */
export function isoWeekday(isoDate: string): number {
  const day = new Date(`${isoDate}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/** "10:30" → 630 (минут от полуночи) */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Проверка формата YYYY-MM-DD с реальной датой (без 2026-02-31) */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
