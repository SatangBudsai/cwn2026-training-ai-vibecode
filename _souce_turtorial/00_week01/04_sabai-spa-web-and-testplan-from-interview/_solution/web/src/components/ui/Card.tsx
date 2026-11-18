import type { HTMLAttributes } from 'react';
import styles from './ui.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** เส้นทองบางรอบการ์ด */
  gold?: boolean;
  /** ลอยขึ้นนิด ๆ เมื่อชี้ */
  hover?: boolean;
  testId?: string;
}

export function Card({ gold, hover, testId, className, ...rest }: CardProps) {
  const cls = [styles.card, gold && styles.cardGold, hover && styles.cardHover, className].filter(Boolean).join(' ');
  return <div data-testid={testId} className={cls} {...rest} />;
}
