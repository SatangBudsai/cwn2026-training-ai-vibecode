import type { ReactNode } from 'react';
import { SmartImage, ThaiPattern } from '@/components/ui';
import styles from './auth.module.css';

export interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  quote: string;
  imageAlt: string;
  children: ReactNode;
}

/** โครงหน้าเข้าสู่ระบบและสมัคร: รูปด้านข้าง · มือถือเป็นแถบบน */
export function AuthShell({ eyebrow, title, subtitle, quote, imageAlt, children }: AuthShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.side}>
        <div className={styles.sideFill}>
          <SmartImage
            src="/brand/misc/login-side.jpg"
            alt={imageAlt}
            sizes="(max-width: 860px) 100vw, 52vw"
            wrapperClassName={styles.sideImage}
            style={{ objectPosition: 'center 62%' }}
            priority
          />
        </div>
        <div className={styles.sideShade} aria-hidden="true" />
        <p className={styles.quote}>{quote}</p>
      </div>
      <div className={styles.pane}>
        <ThaiPattern />
        <div className={styles.panel}>
          <header className={styles.head}>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.sub}>{subtitle}</p>
            <span aria-hidden="true" className={styles.rule} />
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
