import { formatBaht } from '@/lib/format';
import type { Locale } from '@/types';

/** ราคาตามภาษา (ตัวเดียวกับ formatBaht) */
export function priceText(amount: number, locale: Locale): string {
  return formatBaht(amount, locale);
}
