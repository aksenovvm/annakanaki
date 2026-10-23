import { describe, expect, it } from "vitest";
import { signInitData, validateInitData } from "./initData";

const TOKEN = "123456:TEST-token";
const NOW = new Date("2026-10-23T10:00:00Z");
const authDate = String(Math.floor(NOW.getTime() / 1000) - 60); // минуту назад
const user = JSON.stringify({ id: 42, first_name: "Иван", username: "ivan" });

describe("validateInitData", () => {
  it("принимает правильно подписанные данные и достаёт пользователя", () => {
    const initData = signInitData({ user, auth_date: authDate, query_id: "AAA" }, TOKEN);
    const result = validateInitData(initData, TOKEN, 3600, NOW);
    expect(result).toMatchObject({ ok: true, user: { id: 42, first_name: "Иван" } });
  });

  it("проверяет пример строки в формате Telegram (поля в любом порядке)", () => {
    const signed = new URLSearchParams(signInitData({ auth_date: authDate, user }, TOKEN));
    // Telegram может прислать поля в другом порядке — подпись от этого не зависит
    const reordered = `hash=${signed.get("hash")}&user=${encodeURIComponent(user)}&auth_date=${authDate}`;
    expect(validateInitData(reordered, TOKEN, 3600, NOW).ok).toBe(true);
  });

  it("отклоняет подделанного пользователя", () => {
    const initData = signInitData({ user, auth_date: authDate }, TOKEN);
    const forged = initData.replace(encodeURIComponent('"id":42'), encodeURIComponent('"id":1'));
    expect(forged).not.toBe(initData);
    expect(validateInitData(forged, TOKEN, 3600, NOW)).toEqual({ ok: false, reason: "BAD_SIGNATURE" });
  });

  it("отклоняет подпись другим ботом", () => {
    const initData = signInitData({ user, auth_date: authDate }, "999:OTHER");
    expect(validateInitData(initData, TOKEN, 3600, NOW)).toEqual({ ok: false, reason: "BAD_SIGNATURE" });
  });

  it("отклоняет устаревшие данные", () => {
    const old = String(Math.floor(NOW.getTime() / 1000) - 2 * 3600);
    const initData = signInitData({ user, auth_date: old }, TOKEN);
    expect(validateInitData(initData, TOKEN, 3600, NOW)).toEqual({ ok: false, reason: "EXPIRED" });
  });

  it("отклоняет мусор и данные без подписи или пользователя", () => {
    expect(validateInitData("", TOKEN, 3600, NOW).ok).toBe(false);
    expect(validateInitData(`user=${encodeURIComponent(user)}&auth_date=${authDate}`, TOKEN, 3600, NOW).ok).toBe(false);
    expect(validateInitData(signInitData({ auth_date: authDate }, TOKEN), TOKEN, 3600, NOW)).toEqual({
      ok: false,
      reason: "NO_USER",
    });
  });
});
