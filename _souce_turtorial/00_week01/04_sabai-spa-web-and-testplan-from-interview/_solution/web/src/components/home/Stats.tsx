import { Counter, Reveal, Section } from '@/components/ui';
import { f1 } from '@/i18n/f1';
import type { Locale } from '@/types';
import styles from './home.module.css';

export interface StatsProps {
  locale: Locale;
  services: number;
  herbs: number;
  therapists: number;
  languages: number;
}

/** ตัวเลขทุกตัวนับจากข้อมูลจริงที่หน้าส่งมา · ไม่ hardcode */
export function Stats({ locale, services, herbs, therapists, languages }: StatsProps) {
  const m = f1[locale];
  const stats = [
    { key: 'services', value: services, label: m.statServices },
    { key: 'herbs', value: herbs, label: m.statHerbs },
    { key: 'therapists', value: therapists, label: m.statTherapists },
    { key: 'languages', value: languages, label: m.statLanguages },
  ];
  return (
    <Section testId="home-stats" tone="forest" pattern>
      <Reveal>
        <p className={`eyebrow ${styles.statsLabel}`}>{m.statsLabel}</p>
        <dl className={styles.statsGrid}>
          {stats.map((s) => (
            <div key={s.key} className={styles.stat}>
              <dt className={styles.statLabel}>{s.label}</dt>
              <dd className={styles.statNum}>
                <Counter value={s.value} testId={`home-stat-${s.key}`} />
              </dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </Section>
  );
}
