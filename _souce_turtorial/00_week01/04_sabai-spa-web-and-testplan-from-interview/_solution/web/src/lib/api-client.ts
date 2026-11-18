// fetch ฝั่งเบราว์เซอร์: ใส่ภาษาให้ และ throw ApiClientError เมื่อ API ตอบ error
import type { ApiErrorBody, Locale } from '@/types';

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface ApiOptions {
  locale: Locale;
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
}

export async function api<T>(path: string, { locale, method, body, signal }: ApiOptions): Promise<T> {
  const res = await fetch(path, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: {
      'x-locale': locale,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
  });
  const data = (await res.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    throw new ApiClientError(err?.code ?? 'internal', err?.message ?? res.statusText, res.status);
  }
  return data as T;
}
