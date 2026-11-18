import type { Metadata } from 'next';
import { TourViewer } from '@/components/tour/TourViewer';
import { LinkButton } from '@/components/ui';
import { PageIntro } from '@/components/widgets/PageIntro';
import { f8 } from '@/i18n/f8';
import { parseLocale } from '@/i18n/locales';
import type { LocalePageProps } from '@/types';
import styles from '@/components/tour/tour.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Pick<LocalePageProps, 'params'>): Promise<Metadata> {
  const m = f8[parseLocale((await params).locale)];
  return { title: m.tourTitle, description: m.tourSubtitle };
}

export default async function TourPage({ params }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  const m = f8[locale];
  return (
    <>
      <PageIntro testId="tour-intro" titleTestId="tour-title" eyebrow={m.tourEyebrow} title={m.tourTitle} subtitle={m.tourSubtitle} />
      <TourViewer locale={locale} />
      <section className={styles.book} data-testid="tour-book-section">
        <div className={`container ${styles.bookInner}`}>
          <h2>{m.tourBookTitle}</h2>
          <span aria-hidden="true" className={styles.bookRule} />
          <p>{m.tourBookBody}</p>
          <LinkButton testId="tour-book" href={`/${locale}/booking?party=2`} variant="gold" size="lg">
            {m.tourBook}
          </LinkButton>
        </div>
      </section>
    </>
  );
}
