import { describe, expect, it, vi } from "vitest";
import { isOverlapError, isRetryableError, withRetry } from "@barbershop/db";

/** Ошибка в том виде, в каком её отдаёт Prisma с адаптером pg */
function pgError(code: string) {
  return Object.assign(new Error(`Database error. Code: \`${code}\``), {
    meta: { driverAdapterError: { cause: { originalCode: code } } },
  });
}

describe("распознавание ошибок PostgreSQL", () => {
  it("23P01 — пересечение записей", () => {
    expect(isOverlapError(pgError("23P01"))).toBe(true);
    expect(isRetryableError(pgError("23P01"))).toBe(false);
  });

  it("40P01 (deadlock) и 40001 — временные, их нужно повторить", () => {
    expect(isRetryableError(pgError("40P01"))).toBe(true);
    expect(isRetryableError(pgError("40001"))).toBe(true);
    expect(isOverlapError(pgError("40P01"))).toBe(false);
  });

  it("код находится и по тексту ошибки, если структура другая", () => {
    expect(isRetryableError(new Error("Database error. Code: `40P01`. Message: deadlock detected"))).toBe(true);
    expect(isOverlapError(new Error("что-то другое"))).toBe(false);
  });
});

describe("withRetry", () => {
  it("повторяет после deadlock и возвращает результат", async () => {
    const action = vi.fn().mockRejectedValueOnce(pgError("40P01")).mockResolvedValueOnce("ok");
    await expect(withRetry(action)).resolves.toBe("ok");
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("не повторяет обычные ошибки", async () => {
    const action = vi.fn().mockRejectedValue(pgError("23P01"));
    await expect(withRetry(action)).rejects.toThrow();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("сдаётся после заданного числа попыток", async () => {
    const action = vi.fn().mockRejectedValue(pgError("40P01"));
    await expect(withRetry(action, 3)).rejects.toThrow();
    expect(action).toHaveBeenCalledTimes(3);
  });
});
