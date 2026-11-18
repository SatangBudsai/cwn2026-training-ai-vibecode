import Image from 'next/image';
import Link from 'next/link';
import { Card, LinkButton, Parallax, Reveal, Section, SmartImage, ThaiPattern } from '@/components/ui';
import { f1 } from '@/i18n/f1';
import { format, pick } from '@/i18n/locales';
import type { Locale, Service, ServiceId } from '@/types';
import { homePrice } from './price';
import { SectionHead } from './SectionHead';
import styles from './home.module.css';

const FEATURED: ServiceId[] = ['S01', 'S03', 'S04', 'S07'];

export function FeaturedServices({ locale, services }: { locale: Locale; services: Service[] }) {
  const m = f1[locale];
  const featured = FEATURED.flatMap((id) => services.filter((s) => s.id === id));
  return (
    <Section testId="home-services" tone="cream" pattern className={styles.roomy}>
      <SectionHead eyebrow={m.servicesEyebrow} title={m.servicesTitle} lead={m.servicesLead} center />
      <div className={styles.svcGrid}>
        {featured.map((service, i) => (
          <Reveal key={service.id} delay={i * 90} className={styles.svcItem}>
            <Card gold hover className={styles.svcCard}>
              <Link href={`/${locale}/services/${service.id}`} className={styles.svcLink} data-testid={`home-service-${service.id}`}>
                <SmartImage
                  src={service.imagePath}
                  alt={pick(service.name, locale)}
                  ratio="4 / 5"
                  zoom
                  sizes="(min-width: 1041px) 525px, (min-width: 640px) 50vw, 100vw"
                  wrapperClassName={styles.svcImage}
                />
                <div className={styles.svcBody}>
                  <h3 className={styles.svcName}>{pick(service.name, locale)}</h3>
                  <p className={styles.svcMeta}>
                    <span data-testid={`home-service-price-${service.id}`}>{homePrice(service.price, locale)}</span>
                    <span aria-hidden="true" className={styles.dot} />
                    <span>{format(m.duration, { n: service.durationMinutes })}</span>
                  </p>
                  <p className={styles.svcHerbs}>
                    {m.herbsLabel}: {service.herbs.map((h) => pick(h.name, locale)).join(' · ')}
                  </p>
                </div>
              </Link>
            </Card>
          </Reveal>
        ))}
      </div>
      <Reveal className={styles.moreRow}>
        <LinkButton testId="home-services-all" href={`/${locale}/services`} variant="ghost">
          {m.servicesAll}
        </LinkButton>
      </Reveal>
    </Section>
  );
}

export function PackageFeature({ locale, service }: { locale: Locale; service: Service }) {
  const m = f1[locale];
  return (
    <section className={styles.package} data-testid="home-package">
      <div className={styles.packageText}>
        <ThaiPattern tone="light" />
        <Reveal className={styles.packageInner}>
          <p className="eyebrow">{m.packageEyebrow}</p>
          <h2 className={styles.packageTitle}>{pick(service.name, locale)}</h2>
          <span aria-hidden="true" className={styles.ornament} />
          <p className={styles.packageLead}>{m.packageLead}</p>
          <p className={styles.packagePrice}>
            <span data-testid="home-package-price">{format(m.packagePerPerson, { price: homePrice(service.price, locale) })}</span>
            <span aria-hidden="true" className={styles.dot} />
            <span>{format(m.duration, { n: service.durationMinutes })}</span>
          </p>
          <p className={styles.packageNote}>{m.packageNote}</p>
          <LinkButton testId="home-package-link" href={`/${locale}/packages/bangkok-relax`} variant="gold" className={styles.packageCta}>
            {m.packageCta}
          </LinkButton>
        </Reveal>
      </div>
      <div className={styles.packageMedia}>
        <Parallax strength={36} className={styles.packageParallax}>
          <Image src={service.imagePath} alt={pick(service.name, locale)} fill sizes="(min-width: 900px) 60vw, 100vw" style={{ objectFit: 'cover' }} />
        </Parallax>
      </div>
    </section>
  );
}
