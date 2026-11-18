import type { ReactNode } from 'react';
import { ThaiPattern } from './ThaiPattern';
import styles from './ui.module.css';

export interface SectionProps {
  id?: string;
  testId?: string;
  eyebrow?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** พื้นหลังของส่วน */
  tone?: 'page' | 'cream' | 'forest';
  /** ลายไทยจาง ๆ */
  pattern?: boolean;
  align?: 'left' | 'center';
  children?: ReactNode;
  className?: string;
}

export function Section({ id, testId, eyebrow, title, subtitle, tone = 'page', pattern, align = 'left', children, className }: SectionProps) {
  const cls = [styles.section, styles[`section-${tone}`], className].filter(Boolean).join(' ');
  return (
    <section id={id} data-testid={testId} className={cls}>
      {pattern && <ThaiPattern tone={tone === 'forest' ? 'light' : 'dark'} />}
      <div className={`container ${styles.sectionInner}`}>
        {(eyebrow || title || subtitle) && (
          <header className={align === 'center' ? styles.sectionHeadCenter : styles.sectionHead}>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
            {subtitle && <p className={styles.sectionSub}>{subtitle}</p>}
            <span aria-hidden="true" className={styles.goldRule} />
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
