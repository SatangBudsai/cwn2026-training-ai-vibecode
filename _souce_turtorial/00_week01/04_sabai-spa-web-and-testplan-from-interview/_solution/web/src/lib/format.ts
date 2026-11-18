// จัดรูปแบบแสดงผล ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และเบราว์เซอร์
import type { Locale } from '@/types';

/**
 * 1000 → ฿1,000 · โหมด 中文 เป็น 1,000 泰铢
 * เพราะ ฿ คือ U+0E3F อยู่ในช่วง [฀-๿] ที่ NFR-07 ตรวจ
 */
export function formatBaht(amount: number, locale: Locale): string {
  const sign = amount < 0 ? '−' : '';
  const digits = Math.abs(amount).toLocaleString('en-US');
  return locale === 'zh' ? `${sign}${digits} 泰铢` : `${sign}฿${digits}`;
}

const DATE_LOCALE: Record<Locale, string> = {
  th: 'th-TH-u-ca-gregory-nu-latn',
  en: 'en-GB',
  zh: 'zh-CN',
};

/** '2026-09-13' → 13 ก.ย. 2026 · 13 Sept 2026 · 2026年9月13日 */
export function formatDate(date: string, locale: Locale): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function errorTestId(code: string): string {
  return `error-${code}`;
}
