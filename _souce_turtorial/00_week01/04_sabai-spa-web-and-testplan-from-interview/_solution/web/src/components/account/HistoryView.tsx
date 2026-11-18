'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, ErrorMessage, LinkButton, SmartImage, ThaiPattern } from '@/components/ui';
import { common } from '@/i18n/common';
import { f5 } from '@/i18n/f5';
import { pick } from '@/i18n/locales';
import { api } from '@/lib/api-client';
import { formatBaht, formatDate } from '@/lib/format';
import type { HistoryItem, HistoryResponse, Locale } from '@/types';
import { isUnauthorized, loginHref, toUiError, type UiError } from './helpers';
import { TherapistList } from './TherapistList';
import styles from './account.module.css';

export function HistoryView({ locale }: { locale: Locale }) {
  const m = f5[locale];
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState<UiError | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await api<HistoryResponse>('/api/me/history', { locale, signal });
        if (signal?.aborted) return;
        setItems(res.items);
        setError(null);
      } catch (err) {
        if (signal?.aborted) return;
        if (isUnauthorized(err)) router.replace(loginHref(locale, `/${locale}/account/history`));
        else setError(toUiError(err, m.networkError));
      }
    },
    [locale, m.networkError, router],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <div data-testid="history-page">
      <header className={`${styles.hero} ${styles.heroCompact}`}>
        <ThaiPattern tone="light" />
        <div className={`container ${styles.heroInner}`}>
          <p className="eyebrow">{m.historyEyebrow}</p>
          <h1 data-testid="history-title">{m.historyTitle}</h1>
          <p className={styles.heroSub}>{m.historySub}</p>
        </div>
      </header>

      <div className={`container ${styles.historyBody}`}>
        <Link href={`/${locale}/account`} className={styles.backLink} data-testid="history-back">
          {m.historyBack}
        </Link>

        {error && (
          <div className={styles.stateBoxInline}>
            <ErrorMessage code={error.code} message={error.message} />
            <Button testId="history-retry" variant="ghost" size="sm" onClick={() => void load()}>
              {m.retry}
            </Button>
          </div>
        )}

        {!items && !error && <p data-testid="history-loading">{common[locale].loading}</p>}

        {items?.length === 0 && (
          <div className={styles.empty} data-testid="history-empty">
            <SmartImage src="/brand/misc/empty-state.jpg" alt={m.historyEmptyAlt} sizes="(max-width: 640px) 100vw, 520px" ratio="3 / 2" rounded />
            <h2 className={styles.sectionTitle}>{m.historyEmptyTitle}</h2>
            <p>{m.historyEmptyBody}</p>
            <LinkButton testId="history-book" href={`/${locale}/booking`} variant="gold">
              {m.historyBook}
            </LinkButton>
          </div>
        )}

        {items && items.length > 0 && (
          // แสดงตามลำดับที่ API ส่งมา (เรียงจากล่าสุดแล้ว · E251)
          <ol className={styles.timeline} data-testid="history-list">
            {items.map((item) => (
              <li key={item.bookingId} className={styles.timelineItem} data-testid={`history-item-${item.bookingCode}`}>
                <p className={styles.timelineDate} data-testid={`history-date-${item.bookingCode}`}>
                  {formatDate(item.date, locale)} · {item.time}–{item.endTime}
                </p>
                <div className={styles.timelineCard}>
                  <h2 className={styles.timelineService} data-testid={`history-service-${item.bookingCode}`}>
                    {pick(item.serviceName, locale)}
                  </h2>
                  <p className={styles.bookingCode} data-testid={`history-code-${item.bookingCode}`}>
                    {item.bookingCode}
                    {item.usedCourse && <span className="badge badge-gold">{m.usedCourse}</span>}
                  </p>
                  <TherapistList therapists={item.therapists} locale={locale} testIdPrefix={`history-therapist-${item.bookingCode}`} />
                  <dl className={styles.timelineFigures}>
                    <div>
                      <dt>{m.payAtShop}</dt>
                      <dd data-testid={`history-total-${item.bookingCode}`}>{formatBaht(item.payAtShop, locale)}</dd>
                    </div>
                    <div>
                      <dt>{m.historyPoints}</dt>
                      <dd data-testid={`history-points-${item.bookingCode}`}>{item.pointsEarned.toLocaleString('en-US')}</dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
