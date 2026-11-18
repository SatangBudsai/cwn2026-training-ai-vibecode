import Link from 'next/link';
import { SmartImage } from '@/components/ui';
import { f2 } from '@/i18n/f2';
import { format, pick } from '@/i18n/locales';
import type { Locale, ServiceId, Therapist } from '@/types';
import { imageSrc } from './helpers';
import styles from './services.module.css';

/** นักบำบัดที่ทำบริการนี้ได้ · showBook=false สำหรับ K01 ที่ต้องเลือกคอร์สก่อนจอง */
export function TherapistCard({ therapist, serviceId, locale, showBook }: { therapist: Therapist; serviceId: ServiceId; locale: Locale; showBook: boolean }) {
  const m = f2[locale];
  const id = therapist.id;
  const name = pick(therapist.name, locale);
  const hasReviews = therapist.ratingText !== null;
  return (
    <article data-testid={`service-therapist-${id}`} className={styles.therapist}>
      <SmartImage
        src={imageSrc(therapist.photoPath)}
        alt={name}
        ratio="4 / 5"
        rounded
        sizes="(max-width: 640px) calc(50vw - 24px), (max-width: 1024px) 30vw, 270px"
      />
      <h3 data-testid={`service-therapist-name-${id}`}>{name}</h3>
      <p className={styles.therapistTitle}>{pick(therapist.title, locale)}</p>
      <p data-testid={`service-therapist-rating-${id}`} className={styles.therapistRating}>
        {hasReviews ? (
          <>
            <span aria-hidden="true" className={styles.star}>
              ★
            </span>
            <span>{therapist.ratingText}</span>
            <span className={styles.reviewCount}>{format(m.reviewCount, { n: therapist.reviewCount })}</span>
          </>
        ) : (
          <span className={styles.noReviews}>{m.noReviews}</span>
        )}
      </p>
      {showBook && (
        <Link href={`/${locale}/booking?service=${serviceId}&therapist=${id}`} data-testid={`service-therapist-book-${id}`} className={styles.textLink}>
          {format(m.bookWith, { name })}
        </Link>
      )}
    </article>
  );
}
