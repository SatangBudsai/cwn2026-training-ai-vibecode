import Link from 'next/link';
import { Card, SmartImage } from '@/components/ui';
import { f3, f3People, type F3PersonId } from '@/i18n/f3';
import { pick } from '@/i18n/locales';
import type { Locale, Therapist } from '@/types';
import styles from './people.module.css';

/** นักบำบัดในหน้าทีมงาน · ส่วนคะแนนและปุ่มจองอยู่หน้า /therapists */
export function TeamTherapistCard({ therapist: t, locale }: { therapist: Therapist; locale: Locale }) {
  const name = pick(t.name, locale);
  const title = pick(t.title, locale);
  return (
    <Card hover testId={`team-member-${t.id}`} className={styles.teamCard}>
      <SmartImage src={t.photoPath} alt={`${name} · ${title}`} ratio="2 / 3" zoom sizes="(max-width: 760px) 50vw, 380px" />
      <div className={styles.teamBody}>
        <h3 className={styles.teamName} data-testid={`team-name-${t.id}`}>
          {name}
        </h3>
        <p className={styles.personTitle} data-testid={`team-title-${t.id}`}>
          {title}
        </p>
        <Link href={`/${locale}/therapists#therapist-${t.id}`} className={styles.textLink} data-testid={`team-link-${t.id}`}>
          {f3[locale].teamRatingLink}
        </Link>
      </div>
    </Card>
  );
}

/** คุณจันทร์และน้องบัว · ข้อมูลอยู่ใน f3People เพราะไม่ได้อยู่ในรายชื่อจอง */
export function TeamFeatureCard({ id, locale }: { id: F3PersonId; locale: Locale }) {
  const person = f3People[id];
  const name = pick(person.name, locale);
  const title = pick(person.title, locale);
  return (
    <Card gold testId={`team-member-${id}`} className={styles.featureCard}>
      <div className={styles.featurePhoto}>
        <SmartImage src={person.photoPath} alt={`${name} · ${title}`} ratio="2 / 3" sizes="(max-width: 560px) 100vw, 240px" />
      </div>
      <div className={styles.featureBody}>
        <p className={styles.personTitle} data-testid={`team-title-${id}`}>
          {title}
        </p>
        <h3 className={styles.featureName} data-testid={`team-name-${id}`}>
          {name}
        </h3>
        <p className={styles.featureNote} data-testid={`team-note-${id}`}>
          {pick(person.note, locale)}
        </p>
        {id === 'chan' && (
          <Link href={`/${locale}/about`} className={styles.textLink} data-testid="team-about-link">
            {f3[locale].teamAboutLink}
          </Link>
        )}
      </div>
    </Card>
  );
}
