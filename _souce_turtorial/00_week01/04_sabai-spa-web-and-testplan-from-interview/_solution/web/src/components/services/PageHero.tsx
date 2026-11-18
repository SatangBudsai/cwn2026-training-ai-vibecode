import type { ReactNode } from 'react';
import { Parallax, SmartImage } from '@/components/ui';
import styles from './services.module.css';

export interface PageHeroProps {
  testId: string;
  eyebrow: string;
  title: ReactNode;
  titleTestId?: string;
  subtitle?: ReactNode;
  image: string;
  alt: string;
  tall?: boolean;
  children?: ReactNode;
}

/** ภาพเต็มกว้างพร้อมหัวข้อหน้า · ไล่เฉดเข้มด้านล่างให้ข้อความอ่านง่ายทุกภาพ */
export function PageHero({ testId, eyebrow, title, titleTestId, subtitle, image, alt, tall, children }: PageHeroProps) {
  return (
    <section data-testid={testId} className={tall ? styles.heroTall : styles.hero}>
      <Parallax strength={32} className={styles.heroMedia}>
        <SmartImage src={image} alt={alt} sizes="100vw" preload wrapperClassName={styles.heroImage} />
      </Parallax>
      <div aria-hidden="true" className={styles.heroShade} />
      <div className={`container ${styles.heroInner}`}>
        <p className="eyebrow">{eyebrow}</p>
        <h1 data-testid={titleTestId}>{title}</h1>
        {subtitle && <p className={styles.heroSub}>{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}
