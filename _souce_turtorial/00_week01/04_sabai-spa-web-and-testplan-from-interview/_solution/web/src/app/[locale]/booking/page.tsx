import type { Metadata } from 'next';
import { BookingBand } from '@/components/booking/BookingBand';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { parseBookingDeepLink } from '@/components/booking/deep-link';
import { f4 } from '@/i18n/f4';
import { parseLocale } from '@/i18n/locales';
import { getSession } from '@/lib/session';
import type { LocalePageProps } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Pick<LocalePageProps, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  return { title: f4[parseLocale(locale)].metaTitle };
}

export default async function BookingPage({ params, searchParams }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  const initial = parseBookingDeepLink(await searchParams);
  const session = await getSession();
  const m = f4[locale];
  return (
    <>
      <BookingBand eyebrow={m.eyebrow} title={m.title} subtitle={m.subtitle} />
      <BookingFlow locale={locale} initial={initial} role={session?.role ?? null} />
    </>
  );
}
