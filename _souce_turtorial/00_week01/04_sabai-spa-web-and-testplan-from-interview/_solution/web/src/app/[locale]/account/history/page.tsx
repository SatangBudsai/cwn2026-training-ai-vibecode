import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { loginHref } from '@/components/account/helpers';
import { HistoryView } from '@/components/account/HistoryView';
import { f5 } from '@/i18n/f5';
import { parseLocale } from '@/i18n/locales';
import { getSession } from '@/lib/session';
import type { LocalePageProps } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  return { title: f5[parseLocale(locale)].historyTitle };
}

export default async function HistoryPage({ params }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  if (!(await getSession())) redirect(loginHref(locale, `/${locale}/account/history`));
  return <HistoryView locale={locale} />;
}
