import { Card, LinkButton, SmartImage } from '@/components/ui';
import { f6 } from '@/i18n/f6';
import { format, pick } from '@/i18n/locales';
import { formatDate } from '@/lib/format';
import type { CourseSummary, Locale } from '@/types';
import styles from './wallet.module.css';

export function CourseCard({ course, index, locale }: { course: CourseSummary; index: number; locale: Locale }) {
  const m = f6[locale];
  const name = pick(course.serviceName, locale);
  const usedUp = course.remaining <= 0;
  const usable = !usedUp && !course.expired;

  return (
    <Card gold testId={`wallet-course-${index}`} className={styles.course}>
      <SmartImage
        src="/brand/services/svc-k01-contour.jpg"
        alt={name}
        ratio="3 / 2"
        sizes="(max-width: 720px) 100vw, 260px"
        wrapperClassName={styles.courseImage}
      />
      <div className={styles.courseBody}>
        <h3>{name}</h3>
        <p className={styles.courseRemaining} data-testid={`wallet-course-remaining-${index}`}>
          {format(m.remaining, { n: course.remaining, total: course.totalSessions })}
        </p>

        <div className={usable ? styles.dots : `${styles.dots} ${styles.dotsMuted}`} aria-hidden="true">
          {Array.from({ length: course.totalSessions }, (_, i) => {
            const cls =
              i < course.usedSessions
                ? styles.dotUsed
                : i < course.usedSessions + course.reservedSessions
                  ? styles.dotReserved
                  : styles.dotLeft;
            return <span key={i} className={`${styles.dot} ${cls}`} />;
          })}
        </div>

        <dl className={styles.courseFacts}>
          <div>
            <dt>
              <span aria-hidden="true" className={`${styles.dot} ${styles.dotUsed}`} /> {m.usedLabel}
            </dt>
            <dd data-testid={`wallet-course-used-${index}`}>{format(m.sessionCount, { n: course.usedSessions })}</dd>
          </div>
          <div>
            <dt>
              <span aria-hidden="true" className={`${styles.dot} ${styles.dotReserved}`} /> {m.reservedLabel}
            </dt>
            <dd data-testid={`wallet-course-reserved-${index}`}>{format(m.sessionCount, { n: course.reservedSessions })}</dd>
          </div>
          <div>
            <dt>{m.expiresLabel}</dt>
            <dd data-testid={`wallet-course-expires-${index}`}>{formatDate(course.expiresOn, locale)}</dd>
          </div>
        </dl>

        {usedUp && (
          <p className={styles.courseNotice} data-testid={`wallet-course-used-up-${index}`}>
            {m.usedUp}
          </p>
        )}
        {course.expired && (
          <p className={styles.courseNotice} data-testid={`wallet-course-expired-${index}`}>
            {m.expired}
          </p>
        )}
        {usable && (
          <LinkButton
            testId={`wallet-course-book-${index}`}
            href={`/${locale}/booking?service=K01&course=${course.id}`}
            className={styles.courseBook}
          >
            {m.bookWithCourse}
          </LinkButton>
        )}
      </div>
    </Card>
  );
}
