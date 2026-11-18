import { Card, SmartImage } from '@/components/ui';
import type { Testimonial } from '@/content/testimonials';
import { common } from '@/i18n/common';
import { f3 } from '@/i18n/f3';
import { format, pick } from '@/i18n/locales';
import type { Locale, Therapist } from '@/types';
import { Stars } from './Stars';
import styles from './people.module.css';

/** คะแนนรีวิวเก่าของนักบำบัด 1 คน · ดาวทุกแถวมาจาก Therapist.stars ไม่มีการแต่งเพิ่ม */
export function TherapistReviewCard({ therapist: t, locale }: { therapist: Therapist; locale: Locale }) {
  const m = f3[locale];
  const name = pick(t.name, locale);
  return (
    <article className={styles.reviewCard} data-testid={`reviews-card-${t.id}`}>
      <SmartImage src={t.photoPath} alt={name} ratio="3 / 4" sizes="96px" rounded wrapperClassName={styles.reviewPhoto} />
      <div className={styles.reviewBody}>
        <h2 className={styles.reviewName} data-testid={`reviews-name-${t.id}`}>
          {name}
        </h2>
        <p className={styles.reviewRole}>{pick(t.title, locale)}</p>

        {t.rating === null || t.ratingText === null ? (
          <p className={styles.reviewEmpty} data-testid={`reviews-rating-${t.id}`}>
            {m.noReviews}
          </p>
        ) : (
          <>
            <p className={styles.reviewAverage} data-testid={`reviews-rating-${t.id}`}>
              <span className={styles.reviewAverageValue}>{t.ratingText}</span>
              <span>
                {m.reviewsAverage} · {format(m.reviewCount, { count: t.reviewCount })}
              </span>
            </p>
            <ol className={styles.reviewList} data-testid={`reviews-stars-${t.id}`}>
              {t.stars.map((value, i) => {
                const n = i + 1;
                return (
                  <li key={n} className={styles.reviewRow}>
                    <span className={styles.reviewRowLabel}>{format(m.reviewItem, { n })}</span>
                    <Stars
                      tone="dark"
                      size={16}
                      value={value}
                      label={format(m.starsLabel, { value })}
                      testId={`reviews-star-${t.id}-${n}`}
                    />
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </article>
  );
}

/** รีวิวลูกค้าตัวอย่าง · ทุกรูปต้องติดป้าย common.sampleCustomer */
export function TestimonialCard({ item, locale }: { item: Testimonial; locale: Locale }) {
  const name = pick(item.name, locale);
  const sample = common[locale].sampleCustomer;
  return (
    <Card gold testId={`reviews-testimonial-${item.id}`} className={styles.testimonial}>
      <figure className={styles.testimonialFigure}>
        <div className={styles.testimonialPhoto}>
          <SmartImage
            src={item.imagePath}
            alt={`${name} · ${sample}`}
            ratio={item.imageRatio}
            sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 380px"
          />
          <span className={`badge ${styles.sampleBadge}`} data-testid={`reviews-sample-badge-${item.id}`}>
            {sample}
          </span>
        </div>
        <figcaption className={styles.testimonialBody}>
          <blockquote className={styles.testimonialQuote} data-testid={`reviews-quote-${item.id}`}>
            {pick(item.quote, locale)}
          </blockquote>
          <p className={styles.testimonialName} data-testid={`reviews-customer-${item.id}`}>
            {name}
          </p>
          <p className={styles.testimonialRole}>{pick(item.role, locale)}</p>
        </figcaption>
      </figure>
    </Card>
  );
}
