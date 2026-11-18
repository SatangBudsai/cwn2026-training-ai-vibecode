import { NextResponse, type NextRequest } from 'next/server';
import { ERROR_CATALOG, type ErrorCode } from '@/i18n/errors';
import { DEFAULT_LOCALE, isLocale } from '@/i18n/locales';
import type { ApiErrorBody, I18nText, Locale } from '@/types';

/**
 * throw new ApiError('slot-taken') — ใช้ code ในแคตตาล็อก
 * throw new ApiError('my-code', 422, { th, en, zh }) — code เฉพาะงาน
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly messages: I18nText;

  constructor(code: ErrorCode);
  constructor(code: string, status: number, messages: I18nText);
  constructor(code: string, status?: number, messages?: I18nText) {
    const def = (ERROR_CATALOG as Record<string, { status: number } & I18nText>)[code];
    const resolved = messages ?? def ?? ERROR_CATALOG.internal;
    super(resolved.en);
    this.code = code;
    this.status = status ?? def?.status ?? 500;
    this.messages = { th: resolved.th, en: resolved.en, zh: resolved.zh };
  }
}

/** ภาษาของ request: header x-locale → ?locale= → Accept-Language → th */
export function localeFromRequest(req: Request): Locale {
  const header = req.headers.get('x-locale');
  if (isLocale(header)) return header;
  try {
    const q = new URL(req.url).searchParams.get('locale');
    if (isLocale(q)) return q;
  } catch {
    // url เสีย ใช้ค่าถัดไป
  }
  const accept = req.headers.get('accept-language')?.toLowerCase() ?? '';
  if (accept.startsWith('zh')) return 'zh';
  if (accept.startsWith('en')) return 'en';
  return DEFAULT_LOCALE;
}

export function errorBody(err: ApiError, locale: Locale): ApiErrorBody {
  return { error: { code: err.code, message: err.messages[locale] } };
}

function hasPgCode(err: unknown): err is { code: string } {
  return typeof err === 'object' && err !== null && typeof (err as { code?: unknown }).code === 'string';
}

/** แปลงทุก error เป็น ApiError · 23P01 ของ EXCLUDE → 409 slot-taken */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (hasPgCode(err) && err.code === '23P01') return new ApiError('slot-taken');
  console.error('[api] unexpected error', err);
  return new ApiError('internal');
}

export interface RouteContext<P = Record<string, string>> {
  params: Promise<P>;
}

/**
 * ครอบ route handler ทุกตัว: แปลง error เป็นรูปแบบกลางตามภาษาของ request
 *
 *   export const POST = withApi(async (req, ctx, locale) => json({ ok: true }, 201));
 */
export function withApi<P = Record<string, string>>(
  handler: (req: NextRequest, ctx: RouteContext<P>, locale: Locale) => Promise<Response>,
): (req: NextRequest, ctx: RouteContext<P>) => Promise<Response> {
  return async (req, ctx) => {
    const locale = localeFromRequest(req);
    try {
      return await handler(req, ctx, locale);
    } catch (err) {
      const api = toApiError(err);
      return NextResponse.json(errorBody(api, locale), { status: api.status });
    }
  };
}

export function json<T>(data: T, status = 200): Response {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** อ่าน JSON body · รูปแบบเสียงตอบ 400 validation */
export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError('validation');
  }
}
