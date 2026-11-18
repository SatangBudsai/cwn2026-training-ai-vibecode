import type { Metadata } from 'next';
import { PageHero } from '@/components/people/PageHero';
import { TeamFeatureCard, TeamTherapistCard } from '@/components/people/TeamCards';
import styles from '@/components/people/people.module.css';
import { Reveal, Section, SmartImage } from '@/components/ui';
import { common } from '@/i18n/common';
import { f3 } from '@/i18n/f3';
import { parseLocale } from '@/i18n/locales';
import { listTherapists } from '@/lib/catalog';
import type { LocaleParams, LocalePageProps } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<LocaleParams> }): Promise<Metadata> {
  const locale = parseLocale((await params).locale);
  return { title: common[locale].navTeam, description: f3[locale].teamSubtitle };
}

export default async function TeamPage({ params }: LocalePageProps) {
  const locale = parseLocale((await params).locale);
  const m = f3[locale];
  const therapists = await listTherapists();

  return (
    <>
      <PageHero testId="team-hero" eyebrow={m.teamEyebrow} title={m.teamTitle} subtitle={m.teamSubtitle} overlap />

      <div className={`container ${styles.groupWrap}`}>
        <figure className={styles.groupFigure} data-testid="team-group-photo">
          <SmartImage
            src="/brand/shop/team-group.jpg"
            alt={m.teamGroupCaption}
            ratio="3 / 2"
            rounded
            preload
            sizes="(max-width: 1200px) 100vw, 1120px"
          />
          <figcaption className={styles.groupCaption}>{m.teamGroupCaption}</figcaption>
        </figure>
      </div>

      <Section testId="team-front" eyebrow={m.teamFrontEyebrow} title={m.teamFrontTitle}>
        <div className={styles.featureGrid}>
          <Reveal className={styles.gridCell}>
            <TeamFeatureCard id="chan" locale={locale} />
          </Reveal>
          <Reveal delay={90} className={styles.gridCell}>
            <TeamFeatureCard id="bua" locale={locale} />
          </Reveal>
        </div>
      </Section>

      <Section testId="team-therapists" tone="cream" pattern eyebrow={m.teamTherapistsEyebrow} title={m.teamTherapistsTitle} subtitle={m.teamTherapistsSubtitle}>
        <div className={styles.teamGrid} data-testid="team-grid">
          {therapists.map((t, i) => (
            <Reveal key={t.id} delay={(i % 3) * 90} className={styles.gridCell}>
              <TeamTherapistCard therapist={t} locale={locale} />
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
