import { Card, LinkButton, Reveal, Section, SmartImage } from '@/components/ui';
import { testimonials } from '@/content/testimonials';
import { common } from '@/i18n/common';
import { f1 } from '@/i18n/f1';
import { pick } from '@/i18n/locales';
import type { Locale } from '@/types';
import { SectionHead } from './SectionHead';
import styles from './home.module.css';

/** ข้อความและรูปมาจาก content/testimonials.ts เท่านั้น · ทุกรูปติดป้ายลูกค้าตัวอย่าง · ไม่มีคะแนนและไม่มีช่องเขียนรีวิว */
export function Reviews({ locale }: { locale: Locale }) {
  const m = f1[locale];
  const sample = common[locale].sampleCustomer;
  return (
    <Section testId="home-reviews" tone="cream" className={styles.roomy}>
      <SectionHead eyebrow={m.reviewsEyebrow} title={m.reviewsTitle} lead={m.reviewsLead} center />
      <div className={styles.reviewGrid}>
        {testimonials.map((t, i) => {
          const wide = t.imageRatio === '3 / 2';
          const name = pick(t.name, locale);
          return (
            <Reveal key={t.id} delay={(i % 2) * 90} className={wide ? styles.reviewWide : undefined}>
              <Card gold testId={`home-review-${t.id}`} className={wide ? styles.reviewCardWide : styles.reviewCard}>
                <div className={styles.reviewMedia}>
                  <SmartImage
                    src={t.imagePath}
                    alt={`${name} · ${sample}`}
                    ratio={t.imageRatio}
                    sizes={wide ? '(min-width: 860px) 600px, 100vw' : '(min-width: 860px) 260px, 100vw'}
                    style={{ objectPosition: '50% 15%' }}
                    wrapperClassName={wide ? styles.reviewImageWide : styles.reviewImage}
                  />
                  <span className={`badge ${styles.reviewBadge}`} data-testid={`home-review-badge-${t.id}`}>
                    {sample}
                  </span>
                </div>
                <div className={styles.reviewBody}>
                  <span aria-hidden="true" className={styles.reviewMark}>
                    “
                  </span>
                  <p className={wide ? styles.reviewQuoteWide : styles.reviewQuote}>{pick(t.quote, locale)}</p>
                  <p className={styles.reviewName}>{name}</p>
                  <p className={styles.reviewRole}>{pick(t.role, locale)}</p>
                </div>
              </Card>
            </Reveal>
          );
        })}
      </div>
      <Reveal className={styles.moreRow}>
        <LinkButton testId="home-reviews-all" href={`/${locale}/reviews`} variant="ghost">
          {m.reviewsAll}
        </LinkButton>
      </Reveal>
    </Section>
  );
}
