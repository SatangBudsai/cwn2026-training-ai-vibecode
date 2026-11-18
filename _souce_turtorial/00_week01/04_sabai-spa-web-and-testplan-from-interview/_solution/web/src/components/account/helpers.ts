// ตัวช่วยร่วมของหน้าบัญชี ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และเบราว์เซอร์
import { ApiClientError } from '@/lib/api-client';
import type { Locale } from '@/types';

export interface UiError {
  code: string;
  message: string;
}

/** แปลงสิ่งที่ถูก throw เป็นค่าที่ส่งให้ <ErrorMessage> · เครือข่ายล่มไม่มี code จึงเป็น internal */
export function toUiError(err: unknown, fallbackMessage: string): UiError {
  if (err instanceof ApiClientError) return { code: err.code, message: err.message };
  return { code: 'internal', message: fallbackMessage };
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiClientError && err.status === 401;
}

/** รับเฉพาะ path ในเว็บนี้ กัน ?next= พาออกไปเว็บอื่น (//evil.test, /\evil.test, https://…) */
export function safeNext(next: unknown): string | null {
  if (typeof next !== 'string') return null;
  return /^\/(?![/\\])/.test(next) ? next : null;
}

export function loginHref(locale: Locale, next: string): string {
  return `/${locale}/login?next=${next}`;
}

/** โหมด 中文 ห้ามมีตัวอักษรไทย (NFR-07) · ชื่อที่ลูกค้ากรอกเองแปลไม่ได้ จึงไม่แสดง */
export function displayName(fullName: string, locale: Locale): string | null {
  return locale === 'zh' && /[฀-๿]/.test(fullName) ? null : fullName;
}
