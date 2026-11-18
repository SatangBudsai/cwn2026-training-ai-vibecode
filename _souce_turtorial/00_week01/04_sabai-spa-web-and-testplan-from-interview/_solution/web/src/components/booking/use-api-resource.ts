'use client';
import { useEffect, useState } from 'react';
import { ERROR_CATALOG, type ErrorCode } from '@/i18n/errors';
import { ApiClientError, api } from '@/lib/api-client';
import type { Locale } from '@/types';

export interface UiError {
  code: string;
  message: string;
}

export function catalogError(code: ErrorCode, locale: Locale): UiError {
  return { code, message: ERROR_CATALOG[code][locale] };
}

export function toUiError(e: unknown, locale: Locale): UiError {
  if (e instanceof ApiClientError) return { code: e.code, message: e.message };
  return catalogError('internal', locale);
}

export interface ResourceOptions {
  locale: Locale;
  /** null = ยังไม่โหลด */
  path: string | null;
  /** มีค่า = POST */
  body?: unknown;
  /** ข้อมูลเก่าแสดงต่อระหว่างโหลดเฉพาะเมื่อ scope เดิม · ต่าง scope ถือว่าเป็นคนละเรื่อง */
  scope: string;
  /** เพิ่มค่าเพื่อโหลดซ้ำด้วย request เดิม */
  nonce?: number;
  debounceMs?: number;
}

export interface Resource<T> {
  /** ข้อมูลล่าสุดที่สำเร็จใน scope นี้ อาจเก่ากว่า request ปัจจุบันเมื่อ loading หรือ error */
  data: T | null;
  error: UiError | null;
  loading: boolean;
}

interface Settled<T> {
  key: string;
  scope: string;
  data: T | null;
  error: UiError | null;
}

/** โหลดตาม request ปัจจุบัน · request ใหม่ยกเลิกของเก่า ผลที่มาช้าจึงไม่ทับผลใหม่ */
export function useApiResource<T>({ locale, path, body, scope, nonce = 0, debounceMs = 0 }: ResourceOptions): Resource<T> {
  const key = path === null ? null : JSON.stringify([path, body ?? null, nonce]);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    if (key === null) return;
    const [reqPath, reqBody] = JSON.parse(key) as [string, unknown, number];
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api<T>(reqPath, { locale, body: reqBody === null ? undefined : reqBody, signal: controller.signal })
        .then((data) => {
          if (!controller.signal.aborted) setSettled({ key, scope, data, error: null });
        })
        .catch((e: unknown) => {
          if (controller.signal.aborted) return;
          setSettled((prev) => ({
            key,
            scope,
            data: prev?.scope === scope ? prev.data : null,
            error: toUiError(e, locale),
          }));
        });
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, locale, scope, debounceMs]);

  const current = key !== null && settled?.scope === scope ? settled : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: key !== null && settled?.key !== key,
  };
}
