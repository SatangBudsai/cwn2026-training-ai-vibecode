import Image from 'next/image';
import { ThaiPattern } from '@/components/ui';
import styles from './intro.module.css';

export interface PageIntroProps {
  testId: string;
  titleTestId: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  /** ภาพพื้นหลังจาง ๆ ใต้เฉดเขียวเข้ม */
  image?: string;
}

/** ส่วนหัวของหน้า /quiz /mood /skin /tour */
export function PageIntro({ testId, titleTestId, eyebrow, title, subtitle, image }: PageIntroProps) {
  return (
    <section className={styles.intro} data-testid={testId}>
      {image ? <Image src={image} alt="" fill sizes="100vw" preload className={styles.image} /> : <ThaiPattern tone="light" />}
      <div aria-hidden="true" className={image ? styles.shade : undefined} />
      <div className={`container ${styles.inner}`}>
        <p className="eyebrow">{eyebrow}</p>
        <h1 data-testid={titleTestId}>{title}</h1>
        <span aria-hidden="true" className={styles.rule} />
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
    </section>
  );
}
