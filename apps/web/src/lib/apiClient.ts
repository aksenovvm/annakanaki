/**
 * Запросы к API прямо из браузера (для интерактивных частей: свободное время, запись, отмена).
 * Адрес — из NEXT_PUBLIC_API_URL: переменные с префиксом NEXT_PUBLIC_ попадают в код для браузера,
 * поэтому в них можно класть только НЕсекретное (адрес API — не секрет).
 */
import type {
  ApiErrorBody,
  AvailabilityDaysResponse,
  AvailabilityResponse,
  Booking,
  CreateBookingRequest,
} from "@barbershop/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Ошибка от API с кодом: SLOT_TAKEN, TOO_SOON, … или NETWORK, если сервер не ответил */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      ...init,
      headers: init?.body ? { "content-type": "application/json" } : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body as ApiErrorBody | null;
    throw new ApiError(res.status, err?.code ?? "UNKNOWN", err?.message ?? "Что-то пошло не так. Попробуйте ещё раз.");
  }
  return body as T;
}

type SlotQuery = { serviceIds: string[]; barberId: string; rescheduleToken?: string };

function slotParams({ serviceIds, barberId, rescheduleToken }: SlotQuery) {
  const params = new URLSearchParams({ serviceIds: serviceIds.join(","), barberId });
  if (rescheduleToken) params.set("rescheduleToken", rescheduleToken);
  return params;
}

export function fetchAvailabilityDays(query: SlotQuery & { days: number }) {
  const params = slotParams(query);
  params.set("days", String(query.days));
  return request<AvailabilityDaysResponse>(`/availability/days?${params}`);
}

export function fetchAvailability(query: SlotQuery & { date: string }) {
  const params = slotParams(query);
  params.set("date", query.date);
  return request<AvailabilityResponse>(`/availability?${params}`);
}

export function createBooking(body: CreateBookingRequest) {
  return request<Booking>("/bookings", { method: "POST", body: JSON.stringify(body) });
}

export function fetchBooking(token: string) {
  return request<Booking>(`/bookings/${encodeURIComponent(token)}`);
}

export function cancelBooking(token: string) {
  return request<Booking>(`/bookings/${encodeURIComponent(token)}/cancel`, { method: "POST" });
}

export function rescheduleBooking(token: string, startsAt: string) {
  return request<Booking>(`/bookings/${encodeURIComponent(token)}/reschedule`, {
    method: "POST",
    body: JSON.stringify({ startsAt }),
  });
}
