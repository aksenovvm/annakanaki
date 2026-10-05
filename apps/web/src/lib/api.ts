/**
 * Запросы сайта к нашему backend (apps/api).
 * Эти функции вызываются на сервере Next.js (в серверных компонентах),
 * поэтому адрес API берём из обычной серверной переменной API_URL.
 */
import type { ApiErrorBody, Barber, ListResponse, PublicReview, Service } from "@barbershop/shared";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public body: ApiErrorBody | null,
  ) {
    super(body?.message ?? `API ответил ${status}`);
  }
}

async function apiGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    // no-store: каждый раз берём свежие данные из базы — поменяли цену в Supabase, обновили страницу, увидели
    res = await fetch(`${API_URL}/api/v1${path}`, { cache: "no-store" });
  } catch (cause) {
    throw new Error(`API недоступен по адресу ${API_URL}. Запущен ли сервер (npm run dev)?`, { cause });
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiRequestError(res.status, body);
  }
  return (await res.json()) as T;
}

export async function getServices(): Promise<Service[]> {
  return (await apiGet<ListResponse<Service>>("/services")).items;
}

export async function getBarbers(): Promise<Barber[]> {
  return (await apiGet<ListResponse<Barber>>("/barbers")).items;
}

export async function getPublicReviews(limit = 6): Promise<PublicReview[]> {
  return (await apiGet<ListResponse<PublicReview>>(`/reviews/public?limit=${limit}`)).items;
}

/** Результат запроса: данные или признак ошибки — чтобы одна упавшая секция не роняла всю страницу */
export type Loaded<T> = { ok: true; data: T } | { ok: false };

export async function load<T>(promise: Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await promise };
  } catch (error) {
    console.error("[api]", error instanceof Error ? error.message : error);
    return { ok: false };
  }
}
