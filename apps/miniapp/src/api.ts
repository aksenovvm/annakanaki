/**
 * Запросы Mini App к нашему API — тем же адресам, что использует сайт.
 * Отличие одно: к каждому запросу прикладываем initData (Authorization: tma …),
 * чтобы сервер знал, какой пользователь Telegram его делает.
 */
import type {
  ApiErrorBody,
  AvailabilityDaysResponse,
  AvailabilityResponse,
  Barber,
  Booking,
  CreateTelegramBookingRequest,
  ListResponse,
  MeResponse,
  Service,
} from "@barbershop/shared";
import { getInitData } from "./telegram";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    /** Какой запрос и подробности от сервера (сервер присылает их только в режиме разработки) */
    public path = "",
    public details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  const initData = getInitData();
  if (initData) headers.authorization = `tma ${initData}`;
  if (init?.body) headers["content-type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "NETWORK", "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.", path);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      err?.code ?? "UNKNOWN",
      err?.message ?? "Что-то пошло не так. Попробуйте ещё раз.",
      path,
      err?.details,
    );
  }
  return body as T;
}

export const api = {
  me: () => request<MeResponse>("/me"),
  services: () => request<ListResponse<Service>>("/services").then((r) => r.items),
  barbers: () => request<ListResponse<Barber>>("/barbers").then((r) => r.items),
  myBookings: () => request<ListResponse<Booking>>("/me/bookings").then((r) => r.items),

  availabilityDays: (q: { serviceIds: string[]; barberId: string; days: number; rescheduleToken?: string }) =>
    request<AvailabilityDaysResponse>(`/availability/days?${slotParams(q)}&days=${q.days}`),
  availability: (q: { serviceIds: string[]; barberId: string; date: string; rescheduleToken?: string }) =>
    request<AvailabilityResponse>(`/availability?${slotParams(q)}&date=${q.date}`),

  createBooking: (body: CreateTelegramBookingRequest) =>
    request<Booking>("/bookings", { method: "POST", body: JSON.stringify(body) }),
  cancel: (token: string) => request<Booking>(`/bookings/${encodeURIComponent(token)}/cancel`, { method: "POST" }),
  reschedule: (token: string, startsAt: string) =>
    request<Booking>(`/bookings/${encodeURIComponent(token)}/reschedule`, {
      method: "POST",
      body: JSON.stringify({ startsAt }),
    }),
};

function slotParams(q: { serviceIds: string[]; barberId: string; rescheduleToken?: string }) {
  const params = new URLSearchParams({ serviceIds: q.serviceIds.join(","), barberId: q.barberId });
  if (q.rescheduleToken) params.set("rescheduleToken", q.rescheduleToken);
  return params.toString();
}

export const errorText = (e: unknown) => (e instanceof ApiError ? e.message : "Что-то пошло не так. Попробуйте ещё раз.");

/** Технические подробности ошибки — показываем только в режиме разработки, чтобы было что прислать */
export function errorDetails(e: unknown): string | null {
  if (!import.meta.env.DEV) return null;
  if (e instanceof ApiError) {
    const details = e.details ? `\n${JSON.stringify(e.details, null, 2)}` : "";
    return `${e.status} ${e.code} · ${e.path}${details}`;
  }
  return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
}
