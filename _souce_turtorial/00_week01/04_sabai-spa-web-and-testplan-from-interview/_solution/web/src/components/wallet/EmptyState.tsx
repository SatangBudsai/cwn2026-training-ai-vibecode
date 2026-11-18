import type { ReactNode } from 'react';
import { Card, SmartImage } from '@/components/ui';
import { f6 } from '@/i18n/f6';
import type { Locale } from '@/types';
import styles from './wallet.module.css';

export function EmptyState({
  locale,
  testId,
  title,
  body,
  children,
}: {
  locale: Locale;
  testId: string;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <Card gold testId={testId} className={styles.empty}>
      <SmartImage
        src="/brand/misc/empty-state.jpg"
        alt={f6[locale].emptyAlt}
        ratio="3 / 2"
        sizes="(max-width: 720px) 100vw, 320px"
        wrapperClassName={styles.emptyImage}
      />
      <div className={styles.emptyBody}>
        <h3>{title}</h3>
        <p>{body}</p>
        {children}
      </div>
    </Card>
  );
}
