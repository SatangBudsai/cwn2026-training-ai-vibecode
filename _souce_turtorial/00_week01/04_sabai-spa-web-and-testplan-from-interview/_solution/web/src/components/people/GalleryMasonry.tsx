import { Reveal, SmartImage } from '@/components/ui';
import { f3Gallery } from '@/i18n/f3';
import { pick } from '@/i18n/locales';
import type { Locale } from '@/types';
import styles from './people.module.css';

// กล่องแนวตั้งครอปรูปแนวนอน รูปจึงแสดงกว้างกว่ากล่อง ต้องขอไฟล์ใหญ่ขึ้น
const SIZES_LANDSCAPE = '(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 380px';
const SIZES_TALL = '(max-width: 640px) 190vw, (max-width: 1000px) 95vw, 720px';

/** masonry ด้วย CSS columns · ไม่มี lightbox จึงไม่มีสิ่งที่ต้องกดในรูป */
export function GalleryMasonry({ locale }: { locale: Locale }) {
  return (
    <div className={styles.masonry} data-testid="gallery-grid">
      {f3Gallery.map((item) => {
        const title = pick(item.title, locale);
        return (
          <Reveal key={item.id} className={styles.masonryItem}>
            <figure className={styles.masonryFigure} data-testid={`gallery-item-${item.id}`}>
              <SmartImage
                src={item.src}
                alt={title}
                ratio={item.ratio}
                zoom
                rounded
                sizes={item.ratio === '4 / 5' ? SIZES_TALL : SIZES_LANDSCAPE}
                style={item.position ? { objectPosition: item.position } : undefined}
              />
              <figcaption className={styles.masonryCaption} data-testid={`gallery-caption-${item.id}`}>
                <span className={styles.masonryTitle}>{title}</span>
                <span className={styles.masonryText}>{pick(item.caption, locale)}</span>
              </figcaption>
            </figure>
          </Reveal>
        );
      })}
    </div>
  );
}
