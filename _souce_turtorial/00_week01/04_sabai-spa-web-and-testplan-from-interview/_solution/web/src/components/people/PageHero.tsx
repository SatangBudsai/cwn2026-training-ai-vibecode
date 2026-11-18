import type { ReactNode } from 'react';
import { SmartImage, ThaiPattern } from '@/components/ui';
import styles from './people.module.css';

export interface PageHeroProps {
  testId: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** ฉากหลังเป็นรูป · ไม่ส่งจะเป็นพื้นเขียวเข้มลายไทย */
  image?: string;
  /** เว้นด้านล่างให้เนื้อหาถัดไปซ้อนขึ้นมา */
  overlap?: boolean;
  children?: ReactNode;
}

/** หัวหน้าของหน้าใน F3 · รูปฉากหลังเป็นรูปประดับ จึงใช้ alt ว่าง */
export function PageHero({ testId, eyebrow, title, subtitle, image, overlap, children }: PageHeroProps) {
  const cls = [styles.hero, overlap && styles.heroOverlap].filter(Boolean).join(' ');
  return (
    <section className={cls} data-testid={testId}>
      {image ? (
        <>
          <div className={styles.heroMedia}>
            <SmartImage src={image} alt="" sizes="100vw" ratio="16 / 9" preload wrapperClassName={styles.heroMediaImage} />
          </div>
          <div className={styles.heroShade} />
        </>
      ) : (
        <ThaiPattern tone="light" />
      )}
      <div className={`container ${styles.heroInner}`}>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className={styles.heroTitle}>{title}</h1>
        {subtitle && <p className={styles.heroSub}>{subtitle}</p>}
        <span aria-hidden="true" className={styles.heroRule} />
        {children}
      </div>
    </section>
  );
}
