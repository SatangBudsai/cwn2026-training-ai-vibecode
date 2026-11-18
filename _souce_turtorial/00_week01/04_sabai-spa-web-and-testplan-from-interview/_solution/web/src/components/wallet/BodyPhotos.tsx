import { Card, SmartImage } from '@/components/ui';
import { common } from '@/i18n/common';
import { f6 } from '@/i18n/f6';
import { format } from '@/i18n/locales';
import { formatDate } from '@/lib/format';
import type { BodyPhoto, Locale } from '@/types';
import styles from './wallet.module.css';

/** FR-44: แสดงอย่างเดียว ไม่มีช่องกรอกหรืออัปโหลด · FR-46: รูปร่างกายไม่เห็นหน้า */
export function BodyPhotos({ locale, photos }: { locale: Locale; photos: BodyPhoto[] }) {
  const m = f6[locale];
  const ordered = [...photos].sort((a, b) => (a.kind === b.kind ? a.takenOn.localeCompare(b.takenOn) : a.kind === 'BEFORE' ? -1 : 1));

  return (
    <Card gold className={styles.photosCard} testId="wallet-photos">
      <h3>{m.photosTitle}</h3>
      <div className={styles.photoGrid}>
        {ordered.map((photo, index) => {
          const kind = photo.kind === 'BEFORE' ? m.photoBefore : m.photoAfter;
          const date = formatDate(photo.takenOn, locale);
          return (
            <figure key={photo.url} className={styles.photo} data-testid={`wallet-photo-${index}`} data-kind={photo.kind}>
              <div className={styles.photoFrame}>
                <SmartImage
                  src={photo.url}
                  alt={format(m.photoAlt, { kind, date })}
                  ratio="768 / 994"
                  sizes="(max-width: 720px) 50vw, 280px"
                />
                {photo.placeholder && (
                  <span className={`badge ${styles.photoBadge}`} data-testid={`wallet-photo-badge-${index}`}>
                    {common[locale].placeholderBadge}
                  </span>
                )}
              </div>
              <figcaption>
                <strong>{kind}</strong>
                <span>{date}</span>
              </figcaption>
            </figure>
          );
        })}
      </div>
      <p className={styles.photoNote}>{m.photoNote}</p>
    </Card>
  );
}
