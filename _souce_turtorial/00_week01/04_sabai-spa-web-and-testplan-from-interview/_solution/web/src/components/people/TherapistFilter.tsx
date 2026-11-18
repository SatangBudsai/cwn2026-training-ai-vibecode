import Link from 'next/link';
import { f3 } from '@/i18n/f3';
import { format } from '@/i18n/locales';
import type { Locale } from '@/types';
import styles from './people.module.css';

/**
 * ตัวกรองทำงานผ่าน query ?filter=4.5 จึงใช้ได้แม้ไม่มี JS และแชร์ลิงก์ได้
 * กด therapists-filter ซ้ำเมื่อเปิดอยู่ = ปิดตัวกรอง
 */
export function TherapistFilter({ locale, active, count }: { locale: Locale; active: boolean; count: number }) {
  const m = f3[locale];
  const base = `/${locale}/therapists`;
  const seg = (on: boolean) => [styles.segment, on && styles.segmentActive].filter(Boolean).join(' ');

  return (
    <div className={styles.filterBar}>
      <nav aria-label={m.filterLabel} className={styles.segments}>
        <Link
          href={base}
          scroll={false}
          data-testid="therapists-filter-all"
          aria-current={active ? undefined : 'true'}
          className={seg(!active)}
        >
          {m.filterAll}
        </Link>
        <Link
          href={active ? base : `${base}?filter=4.5`}
          scroll={false}
          data-testid="therapists-filter"
          data-active={active}
          aria-current={active ? 'true' : undefined}
          className={seg(active)}
        >
          {m.filter45}
        </Link>
      </nav>
      <p className={styles.filterCount} data-testid="therapists-count" data-count={count}>
        {format(m.resultCount, { count })}
        {active && <span> · {m.filteredNote}</span>}
      </p>
    </div>
  );
}
