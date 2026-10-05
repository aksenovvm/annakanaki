import { z } from "zod";
import { prisma } from "../db";

/** Настройки из таблицы settings. Если ключа нет — берётся значение по умолчанию. */
const settingsSchema = z.object({
  cancel_cutoff_min: z.coerce.number().int().nonnegative().default(30),
  slot_step_min: z.coerce.number().int().min(5).max(240).default(15),
  booking_horizon_days: z.coerce.number().int().min(1).max(365).default(30),
  min_notice_min: z.coerce.number().int().nonnegative().default(30),
});

export type ShopSettings = {
  cancelCutoffMin: number;
  slotStepMin: number;
  bookingHorizonDays: number;
  minNoticeMin: number;
};

export async function loadSettings(): Promise<ShopSettings> {
  const rows = await prisma.setting.findMany();
  const raw = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const s = settingsSchema.parse(raw);
  return {
    cancelCutoffMin: s.cancel_cutoff_min,
    slotStepMin: s.slot_step_min,
    bookingHorizonDays: s.booking_horizon_days,
    minNoticeMin: s.min_notice_min,
  };
}
