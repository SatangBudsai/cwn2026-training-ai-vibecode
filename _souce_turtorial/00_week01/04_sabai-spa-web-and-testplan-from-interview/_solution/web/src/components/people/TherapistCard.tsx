import { Card, LinkButton, SmartImage } from '@/components/ui';
import { f3 } from '@/i18n/f3';
import { format, pick } from '@/i18n/locales';
import type { Locale, Service, Therapist } from '@/types';
import { Stars } from './Stars';
import styles from './people.module.css';

export function TherapistCard({ therapist: t, services, locale }: { therapist: Therapist; services: Service[]; locale: Locale }) {
  const m = f3[locale];
  const name = pick(t.name, locale);
  // เรียงตามเมนูร้าน และตัดรหัสที่ไม่มีในแคตตาล็อก
  const canDo = services.filter((s) => t.serviceIds.includes(s.id));

  return (
    <Card gold hover id={`therapist-${t.id}`} testId={`therapist-card-${t.id}`} data-passes-filter={t.passesFilter} className={styles.therapistCard}>
      <SmartImage
        src={t.photoPath}
        alt={`${name} · ${pick(t.title, locale)}`}
        ratio="2 / 3"
        zoom
        sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 380px"
      />
      <div className={styles.therapistBody}>
        <p className={styles.personTitle} data-testid={`therapist-title-${t.id}`}>
          {pick(t.title, locale)}
        </p>
        <h2 className={styles.therapistName} data-testid={`therapist-name-${t.id}`}>
          {name}
        </h2>

        <p className={styles.rating} data-testid={`therapist-rating-${t.id}`}>
          {t.rating === null || t.ratingText === null ? (
            <span className={styles.noReviews}>{m.noReviews}</span>
          ) : (
            <>
              <Stars value={t.rating} label={format(m.starsLabel, { value: t.ratingText })} testId={`therapist-stars-${t.id}`} />
              <strong className={styles.ratingValue}>{t.ratingText}</strong>
              <span className={styles.ratingCount} data-testid={`therapist-review-count-${t.id}`}>
                {format(m.reviewCount, { count: t.reviewCount })}
              </span>
            </>
          )}
        </p>

        <div className={styles.therapistServices}>
          <p className={styles.smallLabel}>{m.servicesLabel}</p>
          <ul className={styles.chips} data-testid={`therapist-services-${t.id}`}>
            {canDo.map((s) => (
              <li key={s.id} className={styles.chip} data-testid={`therapist-service-${t.id}-${s.id}`}>
                {pick(s.name, locale)}
              </li>
            ))}
          </ul>
        </div>

        <LinkButton
          testId={`therapist-book-${t.id}`}
          href={`/${locale}/booking?therapist=${t.id}`}
          className={styles.fullButton}
        >
          {format(m.bookWith, { name })}
        </LinkButton>
      </div>
    </Card>
  );
}
