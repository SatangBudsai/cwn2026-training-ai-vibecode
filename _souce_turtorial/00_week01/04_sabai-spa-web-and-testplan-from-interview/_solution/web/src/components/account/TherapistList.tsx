import { SmartImage } from '@/components/ui';
import { pick } from '@/i18n/locales';
import type { BookingTherapist, Locale } from '@/types';
import styles from './account.module.css';

/** ชื่อนักบำบัดตามภาษาพร้อมรูปจริง · testIdPrefix เช่น history-therapist-B04 */
export function TherapistList({ therapists, locale, testIdPrefix }: { therapists: BookingTherapist[]; locale: Locale; testIdPrefix: string }) {
  return (
    <ul className={styles.therapists}>
      {therapists.map((t) => {
        const name = pick(t.name, locale);
        return (
          <li key={t.personNo} className={styles.therapist} data-testid={`${testIdPrefix}-${t.personNo}`}>
            <SmartImage src={t.photoPath} alt={name} sizes="44px" ratio="1 / 1" wrapperClassName={styles.therapistPhoto} />
            <span>{name}</span>
          </li>
        );
      })}
    </ul>
  );
}
