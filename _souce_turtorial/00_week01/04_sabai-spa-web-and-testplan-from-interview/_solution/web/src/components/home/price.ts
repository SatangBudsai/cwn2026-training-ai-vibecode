import { f1 } from '@/i18n/f1';
import { format } from '@/i18n/locales';
import type { Locale } from '@/types';

/**
 * ราคาตามภาษา · ไม่ใช้ formatBaht เพราะสัญลักษณ์เงินบาท (U+0E3F) อยู่ในช่วงอักขระไทย
 * ที่ NFR-07 ตรวจในโหมด 中文 · ดู CONTRACT-NOTES/F1.md
 */
export function homePrice(amount: number, locale: Locale): string {
  return format(f1[locale].price, { amount: amount.toLocaleString('en-US') });
}
