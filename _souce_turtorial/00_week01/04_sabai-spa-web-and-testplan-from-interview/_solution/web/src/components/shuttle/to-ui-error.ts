import { f7 } from '@/i18n/f7';
import { ApiClientError } from '@/lib/api-client';
import type { Locale } from '@/types';

export interface UiError {
  code: string;
  message: string;
}

/** error จาก API คงรหัสและข้อความเดิม · เชื่อมต่อไม่ได้ใช้รหัส internal */
export function toUiError(err: unknown, locale: Locale): UiError {
  if (err instanceof ApiClientError) return { code: err.code, message: err.message };
  return { code: 'internal', message: f7[locale].errorNetwork };
}

export function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}
