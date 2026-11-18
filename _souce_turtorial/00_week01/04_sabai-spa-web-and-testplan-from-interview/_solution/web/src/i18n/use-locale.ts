'use client';
import { useParams } from 'next/navigation';
import { parseLocale } from './locales';
import type { Locale } from '@/types';

/** ภาษาจาก URL สำหรับ client component */
export function useLocale(): Locale {
  const params = useParams<{ locale?: string }>();
  return parseLocale(params?.locale);
}
