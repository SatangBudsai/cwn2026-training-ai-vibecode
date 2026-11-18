import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { WalletView } from '@/components/wallet/WalletView';
import { f6 } from '@/i18n/f6';
import { parseLocale } from '@/i18n/locales';
import { getSession } from '@/lib/session';
import type { LocalePageProps } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const locale = parseLocale((await params).locale);
  return { title: f6[locale].walletTitle };
}

export default async function Page({ params }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  // ไม่มี session ไม่ต้องรอหน้าโหลด · ส่วน session หมดอายุระหว่างใช้งาน WalletView จัดการจาก 401
  if (!(await getSession())) redirect(`/${locale}/login?next=/${locale}/wallet`);
  return <WalletView locale={locale} />;
}
