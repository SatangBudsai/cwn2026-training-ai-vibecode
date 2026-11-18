import Link from 'next/link';
import { LinkButton, SmartImage } from '@/components/ui';
import { f2 } from '@/i18n/f2';
import { format, pick } from '@/i18n/locales';
import type { Locale, Service } from '@/types';
import { HerbChips } from './HerbChips';
import { ServicePrice } from './ServicePrice';
import { bookHref, detailHref, durationLabel, imageSrc } from './helpers';
import styles from './services.module.css';

/** หนึ่งบรรทัดในเมนู: รูป · ชื่อ เวลา สมุนไพร · ราคาและปุ่ม */
export function ServiceMenuRow({ service, locale, index }: { service: Service; locale: Locale; index: number }) {
  const m = f2[locale];
  const id = service.id;
  const name = pick(service.name, locale);
  return (
    <article data-testid={`service-card-${id}`} className={styles.row}>
      <Link href={detailHref(locale, id)} data-testid={`service-image-${id}`} aria-label={format(m.detailsNamed, { name })} className={styles.rowImage}>
        <SmartImage
          src={imageSrc(service.imagePath)}
          alt={name}
          ratio="3 / 2"
          rounded
          zoom
          sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 960px) 36vw, 320px"
        />
      </Link>
      <div className={styles.rowBody}>
        <p className={styles.rowMeta}>
          <span aria-hidden="true" className={styles.rowIndex}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <span data-testid={`service-duration-${id}`}>{durationLabel(service, locale)}</span>
        </p>
        <h3 data-testid={`service-name-${id}`}>{name}</h3>
        <p className={styles.rowDesc}>{m[`desc${id}`]}</p>
        <HerbChips herbs={service.herbs} locale={locale} testId={`service-herbs-${id}`} itemTestIdPrefix={`service-herb-${id}`} />
      </div>
      <div className={styles.rowAside}>
        <ServicePrice service={service} locale={locale} testId={`service-price-${id}`} />
        <div className={styles.actions}>
          <LinkButton testId={`service-book-${id}`} href={bookHref(locale, id)} ariaLabel={format(m.bookNamed, { name })}>
            {m.book}
          </LinkButton>
          <Link href={detailHref(locale, id)} data-testid={`service-detail-${id}`} aria-label={format(m.detailsNamed, { name })} className={styles.textLink}>
            {m.details}
          </Link>
        </div>
      </div>
    </article>
  );
}
