import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ServicePrice } from '@/components/services/ServicePrice';
import { TherapistCard } from '@/components/services/TherapistCard';
import { bookHref, durationLabel, imageSrc } from '@/components/services/helpers';
import styles from '@/components/services/services.module.css';
import { LinkButton, Reveal, Section, SmartImage } from '@/components/ui';
import { f2 } from '@/i18n/f2';
import { format, parseLocale, pick } from '@/i18n/locales';
import { getService, listTherapists } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

interface ServiceDetailProps {
  params: Promise<{ locale: string; id: string }>;
}

const loadService = cache((id: string) => getService(id));

export async function generateMetadata({ params }: ServiceDetailProps): Promise<Metadata> {
  const { locale: raw, id } = await params;
  const locale = parseLocale(raw);
  const service = await loadService(id);
  if (!service) return {};
  return { title: pick(service.name, locale), description: f2[locale][`desc${service.id}`] };
}

export default async function ServiceDetailPage({ params }: ServiceDetailProps) {
  const { locale: raw, id: rawId } = await params;
  const locale = parseLocale(raw);
  const service = await loadService(rawId);
  if (!service) notFound();

  const m = f2[locale];
  const id = service.id;
  const name = pick(service.name, locale);
  const isCourse = service.kind === 'COURSE';
  const isPackage = service.kind === 'PACKAGE';
  const therapists = await listTherapists({ serviceId: id });

  return (
    <>
      <div data-testid={`service-detail-page-${id}`} className={`container ${styles.detail}`}>
        <Link href={`/${locale}/services`} data-testid="service-back" className={`${styles.textLink} ${styles.back}`}>
          ← {m.backToServices}
        </Link>
        <div className={styles.detailGrid}>
          <SmartImage
            src={imageSrc(service.imagePath)}
            alt={name}
            ratio="3 / 2"
            rounded
            preload
            sizes="(max-width: 960px) calc(100vw - 32px), 640px"
          />
          <div className={styles.detailPanel}>
            <p className="eyebrow">{m[`kind${service.kind}`]}</p>
            <h1 data-testid={`service-name-${id}`}>{name}</h1>
            <p className={styles.detailDesc}>{m[`desc${id}`]}</p>
            <ServicePrice service={service} locale={locale} testId={`service-price-${id}`} />
            <dl className={styles.facts}>
              <div className={styles.fact}>
                <dt>{m.factDuration}</dt>
                <dd data-testid={`service-duration-${id}`}>{durationLabel(service, locale)}</dd>
              </div>
              <div className={styles.fact}>
                <dt>{m.factMaxParty}</dt>
                <dd data-testid={`service-max-party-${id}`}>{format(service.maxParty === 1 ? m.factMaxPartyOne : m.factMaxPartyValue, { n: service.maxParty })}</dd>
              </div>
              <div className={styles.fact}>
                <dt>{m.factLastSlot}</dt>
                <dd data-testid={`service-last-slot-${id}`}>{service.lastSlot}</dd>
              </div>
            </dl>
            {isPackage && (
              <div className={styles.detailIncludes}>
                <p className={styles.detailIncludesLabel}>{m.packageIncludes}</p>
                <ul data-testid={`service-includes-${id}`} className={`${styles.includeInline} ${styles.includeDark}`}>
                  <li>{m.includeMassage}</li>
                  <li>{m.includeCompress}</li>
                  <li>{m.includeShuttle}</li>
                </ul>
              </div>
            )}
            {isCourse && (
              <p data-testid={`service-note-${id}`} className={styles.detailNote}>
                {m.courseSessions} · {m.courseMemberNote}
              </p>
            )}
            <div className={styles.detailActions}>
              {isCourse ? (
                <>
                  <LinkButton testId={`service-buy-${id}`} href={`/${locale}/wallet`} variant="gold" size="lg">
                    {m.buyCourse}
                  </LinkButton>
                  <LinkButton testId={`service-book-${id}`} href={bookHref(locale, id)} variant="ghost" size="lg">
                    {m.bookWithCourse}
                  </LinkButton>
                </>
              ) : (
                <LinkButton testId={`service-book-${id}`} href={bookHref(locale, id)} variant="gold" size="lg">
                  {m.book}
                </LinkButton>
              )}
              {isPackage && (
                <LinkButton testId={`service-package-${id}`} href={`/${locale}/packages/bangkok-relax`} variant="ghost" size="lg">
                  {m.viewPackage}
                </LinkButton>
              )}
            </div>
          </div>
        </div>
      </div>

      <Section testId="service-herbs-section" tone="cream" eyebrow={m.herbsSectionEyebrow} title={m.herbsSectionTitle}>
        <ul data-testid={`service-herbs-${id}`} className={styles.herbTiles}>
          {service.herbs.map((herb) => {
            const herbName = pick(herb.name, locale);
            return (
              <li key={herb.id} data-testid={`service-herb-${id}-${herb.id}`} className={styles.herbTile}>
                <SmartImage
                  src={imageSrc(herb.imagePath)}
                  alt={herbName}
                  ratio="1 / 1"
                  rounded
                  sizes="(max-width: 640px) calc(50vw - 24px), 200px"
                />
                <p className={styles.herbTileName}>{herbName}</p>
              </li>
            );
          })}
        </ul>
        <div className={styles.sectionLink}>
          <Link href={`/${locale}/herbs`} data-testid="service-herbs-link" className={styles.textLink}>
            {m.herbsSectionLink}
          </Link>
        </div>
      </Section>

      <Section testId="service-therapists-section" eyebrow={m.therapistsEyebrow} title={m.therapistsTitle}>
        <div data-testid={`service-therapists-${id}`} className={styles.therapists}>
          {therapists.map((therapist, index) => (
            <Reveal key={therapist.id} delay={index * 60}>
              <TherapistCard therapist={therapist} serviceId={id} locale={locale} showBook={!isCourse} />
            </Reveal>
          ))}
        </div>
        <div className={styles.sectionLink}>
          <Link href={`/${locale}/therapists`} data-testid="service-therapists-link" className={styles.textLink}>
            {m.therapistsAll}
          </Link>
        </div>
      </Section>
    </>
  );
}
