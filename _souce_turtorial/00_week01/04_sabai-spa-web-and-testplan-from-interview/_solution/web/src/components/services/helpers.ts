import { f2 } from '@/i18n/f2';
import { format } from '@/i18n/locales';
import type { Locale, Service } from '@/types';

/**
 * แปลง path จาก DB เป็น URL ของ next/image · รองรับ /brand/x.jpg, public/brand/x.jpg และ brand-kit/x.jpg
 * ดูสมมติฐานใน CONTRACT-NOTES/F2.md
 */
export function imageSrc(path: string): string {
  const clean = path.replace(/\\/g, '/').replace(/^\.?\/+/, '');
  if (clean.startsWith('public/')) return `/${clean.slice('public/'.length)}`;
  if (clean.startsWith('brand-kit/')) return `/brand/${clean.slice('brand-kit/'.length)}`;
  return `/${clean}`;
}

export function durationLabel(service: Service, locale: Locale): string {
  const m = f2[locale];
  return format(service.kind === 'COURSE' ? m.minutesPerSession : m.minutes, { n: service.durationMinutes });
}

export function bookHref(locale: Locale, serviceId: string): string {
  return `/${locale}/booking?service=${serviceId}`;
}

export function detailHref(locale: Locale, serviceId: string): string {
  return `/${locale}/services/${serviceId}`;
}
