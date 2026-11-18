import Link from 'next/link';
import { LinkButton, Reveal, Section, SmartImage } from '@/components/ui';
import { f1 } from '@/i18n/f1';
import { format, pick } from '@/i18n/locales';
import type { Locale, Service, Therapist } from '@/types';
import { SectionHead } from './SectionHead';
import styles from './home.module.css';

export function TherapistRow({ locale, therapists, services }: { locale: Locale; therapists: Therapist[]; services: Service[] }) {
  const m = f1[locale];
  const serviceName = new Map(services.map((s) => [s.id, pick(s.name, locale)]));
  return (
    <Section testId="home-team" tone="forest" pattern className={styles.roomy}>
      <SectionHead eyebrow={m.teamEyebrow} title={m.teamTitle} lead={m.teamLead} dark />
      <ul className={styles.teamRow}>
        {therapists.map((t, i) => (
          <li key={t.id} className={styles.member}>
            <Reveal delay={i * 70} className={styles.memberReveal}>
              <Link href={`/${locale}/therapists`} className={styles.memberCard} data-testid={`home-therapist-${t.id}`}>
                <SmartImage
                  src={t.photoPath}
                  alt={pick(t.name, locale)}
                  ratio="2 / 3"
                  zoom
                  sizes="(min-width: 1041px) 34vw, (min-width: 900px) 33vw, (min-width: 641px) 50vw, 100vw"
                  style={{ objectPosition: '50% 14%' }}
                  wrapperClassName={styles.memberImage}
                />
                <div className={styles.memberInfo}>
                  <h3 className={styles.memberName}>{pick(t.name, locale)}</h3>
                  <p className={styles.memberTitle}>{pick(t.title, locale)}</p>
                  <div className={styles.memberDetail}>
                    <div className={styles.memberDetailInner}>
                      <p className={styles.memberRating} data-testid={`home-therapist-rating-${t.id}`}>
                        {t.ratingText === null ? (
                          m.noReviews
                        ) : (
                          <>
                            <span aria-hidden="true" className={styles.star}>
                              ★
                            </span>{' '}
                            {t.ratingText} <span className={styles.memberCount}>· {format(m.reviewCount, { n: t.reviewCount })}</span>
                          </>
                        )}
                      </p>
                      <p className={styles.memberServices} data-testid={`home-therapist-services-${t.id}`}>
                        {m.teamServices}: {t.serviceIds.map((id) => serviceName.get(id) ?? '').filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
      <Reveal className={styles.moreRow}>
        <LinkButton testId="home-therapists-all" href={`/${locale}/therapists`} variant="ghost-light">
          {m.teamAll}
        </LinkButton>
      </Reveal>
    </Section>
  );
}
