import type { Metadata } from 'next';
import { TestimonialCard, TherapistReviewCard } from '@/components/people/ReviewCards';
import styles from '@/components/people/people.module.css';
import { LinkButton, Reveal, Section, SmartImage, ThaiPattern } from '@/components/ui';
import { testimonials } from '@/content/testimonials';
import { common } from '@/i18n/common';
import { f3 } from '@/i18n/f3';
import { parseLocale } from '@/i18n/locales';
import { listTherapists } from '@/lib/catalog';
import type { LocaleParams, LocalePageProps } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<LocaleParams> }): Promise<Metadata> {
  const locale = parseLocale((await params).locale);
  return { title: common[locale].navReviews, description: f3[locale].reviewsSubtitle };
}

/** FR-72: หน้านี้อ่านอย่างเดียว ไม่มีช่องเขียนหรือลบรีวิว */
export default async function ReviewsPage({ params }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  const m = f3[locale];
  const therapists = await listTherapists();

  return (
    <>
      <section className={styles.reviewsBand} data-testid="reviews-hero">
        <div className={styles.heroMedia}>
          <SmartImage src="/brand/misc/review-bg.jpg" alt="" ratio="16 / 9" sizes="100vw" preload wrapperClassName={styles.heroMediaImage} />
        </div>
        <div className={styles.reviewsShade} />
        <div className={`container ${styles.reviewsInner}`}>
          <header className={styles.heroInner}>
            <p className="eyebrow">{m.reviewsEyebrow}</p>
            <h1 className={styles.heroTitle}>{m.reviewsTitle}</h1>
            <p className={styles.heroSub}>{m.reviewsSubtitle}</p>
            <span aria-hidden="true" className={styles.heroRule} />
          </header>
          <div className={styles.reviewGrid} data-testid="reviews-therapists">
            {therapists.map((t, i) => (
              <Reveal key={t.id} delay={(i % 2) * 90} className={styles.gridCell}>
                <TherapistReviewCard therapist={t} locale={locale} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Section testId="reviews-customers" tone="cream" pattern eyebrow={m.reviewsCustomersEyebrow} title={m.reviewsCustomersTitle} subtitle={m.reviewsCustomersSubtitle}>
        <div className={styles.testimonialMasonry} data-testid="reviews-testimonials">
          {testimonials.map((item) => (
            <Reveal key={item.id} className={styles.masonryItem}>
              <TestimonialCard item={item} locale={locale} />
            </Reveal>
          ))}
          {/* การ์ดปิดท้าย: ถ้าไม่มีคอลัมน์สุดท้ายจะสั้นกว่าคอลัมน์อื่นมาก */}
          <Reveal className={styles.masonryItem}>
            <div className={styles.testimonialCta} data-testid="reviews-cta">
              <ThaiPattern tone="light" />
              <p className="eyebrow">{m.reviewsCtaEyebrow}</p>
              <p className={styles.testimonialCtaTitle}>{m.reviewsCtaTitle}</p>
              <LinkButton testId="reviews-cta-book" href={`/${locale}/booking`} variant="gold">
                {common[locale].book}
              </LinkButton>
            </div>
          </Reveal>
        </div>
        <div className={styles.reviewsFoot}>
          <p className={styles.reviewsNote} data-testid="reviews-note">
            {m.reviewsNote}
          </p>
          <LinkButton testId="reviews-therapists-link" href={`/${locale}/therapists`} variant="ghost">
            {common[locale].navTherapists}
          </LinkButton>
        </div>
      </Section>
    </>
  );
}
