import type { Metadata } from 'next';
import { BookingBand } from '@/components/booking/BookingBand';
import { CancelForm } from '@/components/booking/CancelForm';
import { firstParam } from '@/components/booking/deep-link';
import styles from '@/components/booking/booking.module.css';
import { SmartImage } from '@/components/ui';
import { f4 } from '@/i18n/f4';
import { parseLocale } from '@/i18n/locales';
import type { LocalePageProps } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Pick<LocalePageProps, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  return { title: f4[parseLocale(locale)].metaCancelTitle };
}

export default async function BookingCancelPage({ params, searchParams }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  const code = firstParam((await searchParams).code) ?? '';
  const m = f4[locale];
  return (
    <>
      <BookingBand eyebrow={m.cancelEyebrow} title={m.cancelTitle} subtitle={m.cancelSubtitle} />
      <div className={`container ${styles.cancelLayout}`}>
        <div className={styles.cancelCard}>
          <CancelForm locale={locale} initialCode={code} />
        </div>
        <div className={styles.cancelImage}>
          <SmartImage src="/brand/shop/lobby.jpg" alt={m.cancelImageAlt} ratio="4 / 5" rounded sizes="(max-width: 900px) 100vw, 440px" />
        </div>
      </div>
    </>
  );
}
