import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/services/PageHero';
import { detailHref, imageSrc } from '@/components/services/helpers';
import styles from '@/components/services/services.module.css';
import { LinkButton, Reveal, Section, SmartImage } from '@/components/ui';
import { f2 } from '@/i18n/f2';
import { format, parseLocale, pick } from '@/i18n/locales';
import { listHerbs, listServices } from '@/lib/catalog';
import type { LocalePageProps } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Pick<LocalePageProps, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  const m = f2[parseLocale(locale)];
  return { title: m.herbsMetaTitle, description: m.herbsSubtitle };
}

export default async function HerbsPage({ params }: Pick<LocalePageProps, 'params'>) {
  const locale = parseLocale((await params).locale);
  const m = f2[locale];
  const [herbs, services] = await Promise.all([listHerbs(), listServices()]);
  const serviceById = new Map(services.map((s) => [s.id, s]));

  return (
    <>
      <PageHero
        testId="herbs-hero"
        titleTestId="herbs-title"
        eyebrow={m.herbsEyebrow}
        title={format(m.herbsTitle, { n: herbs.length })}
        subtitle={m.herbsSubtitle}
        image="/brand/shop/herb-bar.jpg"
        alt={m.herbsHeroAlt}
      />

      <Section testId="herbs-section">
        <div data-testid="herbs-list" className={styles.herbGrid}>
          {herbs.map((herb, index) => {
            const name = pick(herb.name, locale);
            return (
              <Reveal key={herb.id} delay={(index % 4) * 60}>
                <article data-testid={`herbs-card-${herb.id}`} className={styles.herbCard}>
                  <SmartImage
                    src={imageSrc(herb.imagePath)}
                    alt={name}
                    ratio="1 / 1"
                    zoom
                    sizes="(max-width: 640px) 104px, (max-width: 1024px) 31vw, 270px"
                  />
                  <div className={styles.herbCardBody}>
                    <h2 data-testid={`herbs-name-${herb.id}`}>{name}</h2>
                    <p className={styles.herbUsed}>{m.herbsUsedIn}</p>
                    <ul data-testid={`herbs-services-${herb.id}`} className={styles.herbServices}>
                      {herb.serviceIds.map((serviceId) => {
                        const service = serviceById.get(serviceId);
                        if (!service) return null;
                        return (
                          <li key={serviceId}>
                            <Link
                              href={detailHref(locale, serviceId)}
                              data-testid={`herbs-service-${herb.id}-${serviceId}`}
                              className={styles.herbServiceLink}
                            >
                              {pick(service.name, locale)}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Section>

      <Section testId="herbs-cta" tone="forest" pattern>
        <div className={styles.cta}>
          <h2>{m.herbsCtaTitle}</h2>
          <div className={styles.ctaActions}>
            <LinkButton testId="herbs-services-link" href={`/${locale}/services`} variant="gold" size="lg">
              {m.herbsCta}
            </LinkButton>
          </div>
        </div>
      </Section>
    </>
  );
}
