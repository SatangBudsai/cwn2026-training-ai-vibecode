import type { Metadata } from 'next';
import { AdminBoard } from '@/components/admin/AdminBoard';
import { f6 } from '@/i18n/f6';
import { parseLocale } from '@/i18n/locales';
import type { LocalePageProps } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const locale = parseLocale((await params).locale);
  return { title: f6[locale].adminTitle };
}

export default async function Page({ params }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  return <AdminBoard locale={locale} />;
}
