import type { Metadata } from 'next';
import { FeaturedServiceCard } from '@/components/services/FeaturedServiceCard';
import { PageHero } from '@/components/services/PageHero';
import { ServiceMenuRow } from '@/components/services/ServiceMenuRow';
import styles from '@/components/services/services.module.css';
import { LinkButton, Reveal, Section } from '@/components/ui';
import { f2 } from '@/i18n/f2';
import { parseLocale } from '@/i18n/locales';
import { listServices } from '@/lib/catalog';
import type { LocalePageProps } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Pick<LocalePageProps, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  const m = f2[parseLocale(locale)];
  return { title: m.servicesMetaTitle, description: m.servicesSubtitle };
}

export default async function ServicesPage({ params }: Pick<LocalePageProps, 'params'>) {
  const locale = parseLocale((await params).locale);
  const m = f2[locale];
  const services = await listServices();
  const treatments = services.filter((s) => s.kind === 'SERVICE');
  const featured = services.filter((s) => s.kind !== 'SERVICE');

  return (
    <>
      <PageHero
        testId="services-hero"
        titleTestId="services-title"
        eyebrow={m.servicesEyebrow}
        title={m.servicesTitle}
        subtitle={m.servicesSubtitle}
        image="/brand/shop/herbal-steam.jpg"
        alt={m.servicesHeroAlt}
      />

      <Section testId="services-treatments" eyebrow={m.treatmentsEyebrow} title={m.treatmentsTitle}>
        <div data-testid="services-list" className={styles.rows}>
          {treatments.map((service, index) => (
            <Reveal key={service.id}>
              <ServiceMenuRow service={service} locale={locale} index={index} />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section testId="services-featured" tone="forest" pattern eyebrow={m.featuredEyebrow} title={m.featuredTitle}>
        <div className={styles.features}>
          {featured.map((service, index) => (
            <Reveal key={service.id} delay={index * 120} className={styles.featureWrap}>
              <FeaturedServiceCard service={service} locale={locale} />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section testId="services-more" tone="cream">
        <div className={styles.more}>
          <div className={styles.moreText}>
            <h2>{m.moreTitle}</h2>
            <p className={styles.moreBody}>{m.moreBody}</p>
          </div>
          <div className={styles.moreActions}>
            <LinkButton testId="services-herbs-link" href={`/${locale}/herbs`}>
              {m.moreHerbs}
            </LinkButton>
            <LinkButton testId="services-quiz-link" href={`/${locale}/quiz`} variant="ghost">
              {m.moreQuiz}
            </LinkButton>
          </div>
        </div>
      </Section>
    </>
  );
}
