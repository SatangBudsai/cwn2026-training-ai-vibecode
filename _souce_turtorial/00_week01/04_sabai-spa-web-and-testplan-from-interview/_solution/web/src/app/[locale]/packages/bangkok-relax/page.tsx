import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HerbChips } from '@/components/services/HerbChips';
import { PageHero } from '@/components/services/PageHero';
import { ServicePrice } from '@/components/services/ServicePrice';
import { bookHref, durationLabel, imageSrc } from '@/components/services/helpers';
import styles from '@/components/services/services.module.css';
import { LinkButton, Reveal, Section, SmartImage } from '@/components/ui';
import { f2 } from '@/i18n/f2';
import { format, parseLocale, pick } from '@/i18n/locales';
import { getService } from '@/lib/catalog';
import type { LocalePageProps } from '@/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Pick<LocalePageProps, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  const m = f2[parseLocale(locale)];
  return { title: m.packageMetaTitle, description: m.packageTagline };
}

export default async function BangkokRelaxPage({ params }: Pick<LocalePageProps, 'params'>) {
  const locale = parseLocale((await params).locale);
  const service = await getService('P01');
  if (!service) notFound();

  const m = f2[locale];
  const includes = [
    { key: 'massage', title: m.includeMassage, body: m.packageMassageBody, image: '/brand/services/svc-s01-thai60.jpg', alt: m.packageMassageAlt },
    { key: 'compress', title: m.includeCompress, body: m.packageCompressBody, image: '/brand/services/svc-s03-compress.jpg', alt: m.packageCompressAlt },
    { key: 'shuttle', title: m.includeShuttle, body: m.packageShuttleBody, image: '/brand/shop/exterior-day.jpg', alt: m.packageShuttleAlt },
  ];
  const rules = [
    { key: 'shuttle', title: m.ruleShuttleTitle, body: m.ruleShuttleBody },
    { key: 'location', title: m.ruleLocationTitle, body: m.ruleLocationBody },
    { key: 'party', title: format(m.rulePartyTitle, { n: service.maxParty }), body: m.rulePartyBody },
    { key: 'discount', title: m.ruleDiscountTitle, body: m.ruleDiscountBody },
    { key: 'payment', title: m.rulePaymentTitle, body: m.rulePaymentBody },
  ];

  return (
    <>
      <PageHero
        tall
        testId="package-hero"
        titleTestId="package-title"
        eyebrow={m.packageEyebrow}
        title={pick(service.name, locale)}
        subtitle={m.packageTagline}
        image={imageSrc(service.imagePath)}
        alt={pick(service.name, locale)}
      >
        <div className={styles.heroPrice}>
          <ServicePrice service={service} locale={locale} testId="package-price" className={styles.priceLight} />
          <span data-testid="package-duration" className={styles.heroDuration}>
            {durationLabel(service, locale)}
          </span>
        </div>
        <div className={styles.heroActions}>
          <LinkButton testId="package-book" href={bookHref(locale, service.id)} variant="gold" size="lg">
            {m.book}
          </LinkButton>
        </div>
      </PageHero>

      <Section testId="package-includes" eyebrow={m.packageIncludesEyebrow} title={m.packageIncludesTitle}>
        <ol className={styles.includes}>
          {includes.map((item, index) => (
            <li key={item.key} data-testid={`package-include-${item.key}`}>
              <Reveal delay={index * 100} className={styles.include}>
                <SmartImage src={item.image} alt={item.alt} ratio="3 / 2" rounded zoom sizes="(max-width: 640px) calc(100vw - 32px), 33vw" />
                <span aria-hidden="true" className={styles.includeNo}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3>{item.title}</h3>
                <p className={styles.includeBody}>{item.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </Section>

      <Section testId="package-rules" tone="cream" eyebrow={m.packageRulesEyebrow} title={m.packageRulesTitle}>
        <div className={styles.rulesGrid}>
          <div>
            <ul className={styles.rules}>
              {rules.map((rule) => (
                <li key={rule.key} data-testid={`package-rule-${rule.key}`} className={styles.rule}>
                  <span className={styles.ruleTitle}>{rule.title}</span>
                  <span className={styles.ruleBody}>{rule.body}</span>
                </li>
              ))}
            </ul>
            <div className={styles.rulesHerbs}>
              <HerbChips herbs={service.herbs} locale={locale} testId="package-herbs" itemTestIdPrefix="package-herb" />
            </div>
          </div>
          <SmartImage
            src="/brand/shop/garden-sala.jpg"
            alt={m.packageGardenAlt}
            ratio="4 / 5"
            rounded
            sizes="(max-width: 860px) calc(100vw - 32px), 460px"
          />
        </div>
      </Section>

      <Section testId="package-shop" eyebrow={m.packageShopEyebrow} title={m.packageShopTitle}>
        <div className={styles.shop}>
          <SmartImage src="/brand/shop/lobby.jpg" alt={m.packageLobbyAlt} ratio="3 / 2" rounded zoom sizes="(max-width: 640px) calc(100vw - 32px), 40vw" />
          <SmartImage src="/brand/shop/herbal-steam.jpg" alt={m.servicesHeroAlt} ratio="3 / 2" rounded zoom sizes="(max-width: 640px) 50vw, 40vw" />
          <SmartImage src="/brand/shop/welcome-tea.jpg" alt={m.packageTeaAlt} ratio="3 / 4" rounded zoom sizes="(max-width: 640px) 50vw, 20vw" />
        </div>
      </Section>

      <Section testId="package-cta" tone="forest" pattern>
        <div className={styles.cta}>
          <h2>{m.packageCtaTitle}</h2>
          <p className={styles.ctaBody}>{m.packageCtaBody}</p>
          <div className={styles.ctaActions}>
            <LinkButton testId="package-book-bottom" href={bookHref(locale, service.id)} variant="gold" size="lg">
              {m.book}
            </LinkButton>
            <LinkButton testId="package-shuttle-link" href={`/${locale}/shuttle`} variant="ghost-light" size="lg">
              {m.packageShuttleLink}
            </LinkButton>
            <LinkButton testId="package-services-link" href={`/${locale}/services`} variant="ghost-light" size="lg">
              {m.packageServicesLink}
            </LinkButton>
          </div>
        </div>
      </Section>
    </>
  );
}
