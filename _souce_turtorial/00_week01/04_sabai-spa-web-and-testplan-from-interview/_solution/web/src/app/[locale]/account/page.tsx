import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AccountView } from '@/components/account/AccountView';
import { loginHref } from '@/components/account/helpers';
import { f5 } from '@/i18n/f5';
import { parseLocale } from '@/i18n/locales';
import { getSession } from '@/lib/session';
import type { LocalePageProps } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  return { title: f5[parseLocale(locale)].accountTitle };
}

export default async function AccountPage({ params }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  // ไม่มี cookie ไปหน้าเข้าสู่ระบบเลยไม่ต้องรอเบราว์เซอร์ · cookie ใช้ไม่ได้แล้ว AccountView จัดการจาก 401 ของ GET /api/me
  if (!(await getSession())) redirect(loginHref(locale, `/${locale}/account`));
  return <AccountView locale={locale} />;
}
