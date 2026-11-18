import { f2 } from '@/i18n/f2';
import { formatBaht } from '@/lib/format';
import type { Locale, Service } from '@/types';
import styles from './services.module.css';

/** ฿1,000/คน · ฿2,900/คน · ฿15,000 ต่อคอร์ส */
export function ServicePrice({ service, locale, testId, className }: { service: Service; locale: Locale; testId: string; className?: string }) {
  const m = f2[locale];
  return (
    <p data-testid={testId} className={[styles.price, className].filter(Boolean).join(' ')}>
      <span className={styles.priceAmount}>{formatBaht(service.price, locale)}</span>
      <span className={styles.priceUnit}>{service.kind === 'COURSE' ? m.perCourse : m.perPerson}</span>
    </p>
  );
}
