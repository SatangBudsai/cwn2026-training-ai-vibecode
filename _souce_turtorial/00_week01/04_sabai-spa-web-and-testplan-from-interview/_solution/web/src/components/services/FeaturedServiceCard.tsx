import Link from 'next/link';
import { LinkButton, SmartImage } from '@/components/ui';
import { f2 } from '@/i18n/f2';
import { format, pick } from '@/i18n/locales';
import type { Locale, Service } from '@/types';
import { HerbChips } from './HerbChips';
import { ServicePrice } from './ServicePrice';
import { bookHref, detailHref, durationLabel, imageSrc } from './helpers';
import styles from './services.module.css';

/** การ์ดใหญ่บนพื้นเขียวเข้ม สำหรับ P01 และ K01 */
export function FeaturedServiceCard({ service, locale }: { service: Service; locale: Locale }) {
  const m = f2[locale];
  const id = service.id;
  const name = pick(service.name, locale);
  const isCourse = service.kind === 'COURSE';
  return (
    <article data-testid={`service-card-${id}`} className={styles.feature}>
      <Link href={detailHref(locale, id)} data-testid={`service-image-${id}`} aria-label={format(m.detailsNamed, { name })}>
        <SmartImage
          src={imageSrc(service.imagePath)}
          alt={name}
          ratio="3 / 2"
          zoom
          sizes="(max-width: 860px) calc(100vw - 32px), 560px"
        />
      </Link>
      <div className={styles.featureBody}>
        <p className={styles.featureMeta}>
          <span>{m[`kind${service.kind}`]}</span>
          <span aria-hidden="true">·</span>
          <span data-testid={`service-duration-${id}`}>{durationLabel(service, locale)}</span>
        </p>
        <h3 data-testid={`service-name-${id}`}>{name}</h3>
        <ServicePrice service={service} locale={locale} testId={`service-price-${id}`} className={styles.priceLight} />
        <p className={styles.featureDesc}>{m[`desc${id}`]}</p>
        {isCourse ? (
          <p data-testid={`service-note-${id}`} className={styles.featureNote}>
            {m.courseSessions}
          </p>
        ) : (
          <ul data-testid={`service-includes-${id}`} className={styles.includeInline}>
            <li>{m.includeMassage}</li>
            <li>{m.includeCompress}</li>
            <li>{m.includeShuttle}</li>
          </ul>
        )}
        <HerbChips herbs={service.herbs} locale={locale} testId={`service-herbs-${id}`} itemTestIdPrefix={`service-herb-${id}`} tone="light" />
        <div className={styles.featureActions}>
          {isCourse ? (
            <>
              <LinkButton testId={`service-buy-${id}`} href={`/${locale}/wallet`} variant="gold" ariaLabel={`${m.buyCourse} ${name}`}>
                {m.buyCourse}
              </LinkButton>
              <LinkButton testId={`service-book-${id}`} href={bookHref(locale, id)} variant="ghost-light" ariaLabel={format(m.bookNamed, { name })}>
                {m.bookWithCourse}
              </LinkButton>
            </>
          ) : (
            <>
              <LinkButton testId={`service-book-${id}`} href={bookHref(locale, id)} variant="gold" ariaLabel={format(m.bookNamed, { name })}>
                {m.book}
              </LinkButton>
              <LinkButton testId={`service-package-${id}`} href={`/${locale}/packages/bangkok-relax`} variant="ghost-light">
                {m.viewPackage}
              </LinkButton>
            </>
          )}
          <Link href={detailHref(locale, id)} data-testid={`service-detail-${id}`} aria-label={format(m.detailsNamed, { name })} className={styles.textLinkLight}>
            {m.details}
          </Link>
        </div>
      </div>
    </article>
  );
}
