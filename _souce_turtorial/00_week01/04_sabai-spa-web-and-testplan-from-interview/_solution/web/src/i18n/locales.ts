import type { I18nText, Locale } from '@/types';

export const LOCALES: readonly Locale[] = ['th', 'en', 'zh'];
export const DEFAULT_LOCALE: Locale = 'th';

export function isLocale(v: unknown): v is Locale {
  return v === 'th' || v === 'en' || v === 'zh';
}

export function parseLocale(v: unknown): Locale {
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** เลือกข้อความตามภาษา */
export function pick(text: I18nText, locale: Locale): string {
  return text[locale];
}

/**
 * type บังคับให้ key ครบ 3 ภาษา: key ของ th เป็นตัวกำหนด en และ zh ต้องมีครบและห้ามเกิน
 *
 *   export const f4 = defineMessages({ th: { title: 'จอง' }, en: { title: 'Book' }, zh: { title: '预订' } });
 *   const m = f4[locale]; m.title;
 *
 * แทนค่าในข้อความด้วย {name} แล้วเรียก format(m.key, { name })
 */
export function defineMessages<K extends string>(messages: {
  th: Record<K, string>;
  en: Record<NoInfer<K>, string>;
  zh: Record<NoInfer<K>, string>;
}): Record<Locale, Record<K, string>> {
  return messages;
}

export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in values ? String(values[k]) : `{${k}}`));
}
