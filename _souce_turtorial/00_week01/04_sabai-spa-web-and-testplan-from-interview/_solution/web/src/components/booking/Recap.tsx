import { SmartImage } from '@/components/ui';
import { f4 } from '@/i18n/f4';
import { format, pick } from '@/i18n/locales';
import { formatDate } from '@/lib/format';
import type { Locale, Service } from '@/types';
import styles from './booking.module.css';

export interface RecapProps {
  locale: Locale;
  service: Service;
  party: number;
  courseMode: boolean;
  date?: string;
  time?: string;
  /** แสดงเฉพาะหน้าจอ 3 */
  therapistLabel?: string;
}

/** เตือนความจำว่าเลือกอะไรไว้ · ไม่มีตัวเลขเงินในนี้ */
export function Recap({ locale, service, party, courseMode, date, time, therapistLabel }: RecapProps) {
  const m = f4[locale];
  return (
    <div className={styles.recap} data-testid="booking-recap">
      <div className={styles.recapImage}>
        <SmartImage src={service.imagePath} alt="" ratio="1 / 1" sizes="64px" />
      </div>
      <div className={styles.recapBody}>
        <p className={styles.recapName} data-testid="booking-recap-service">
          {pick(service.name, locale)}
        </p>
        <p className={styles.recapMeta}>
          <span>{format(m.minutes, { n: service.durationMinutes })}</span>
          <span data-testid="booking-recap-party">{format(m.recapParty, { n: party })}</span>
          {courseMode && <span>{m.recapCourse}</span>}
          {party === 2 && <span>{m.recapSuite}</span>}
        </p>
        {date && (
          <p className={styles.recapWhen} data-testid="booking-recap-when">
            {formatDate(date, locale)}
            {time ? ` · ${time}` : ''}
          </p>
        )}
        {therapistLabel && (
          <p className={styles.recapMeta} data-testid="booking-recap-therapist">
            {therapistLabel}
          </p>
        )}
      </div>
    </div>
  );
}
