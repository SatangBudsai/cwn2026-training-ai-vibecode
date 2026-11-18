import { ApiClientError } from '@/lib/api-client';

export interface UiError {
  code: string;
  message: string;
}

/** แปลง error ของ api() เป็นข้อมูลสำหรับ <ErrorMessage> · เชื่อมต่อไม่ได้ใช้ code 'network' */
export function toUiError(e: unknown, networkMessage: string): UiError {
  if (e instanceof ApiClientError) return { code: e.code, message: e.message };
  return { code: 'network', message: networkMessage };
}
