'use client';
import { useState } from 'react';
import { Button, ErrorMessage } from '@/components/ui';
import { f6 } from '@/i18n/f6';
import { format } from '@/i18n/locales';
import { api, ApiClientError } from '@/lib/api-client';
import { formatBaht, formatDate } from '@/lib/format';
import type { CourseSummary, Locale, PurchaseCourseResponse } from '@/types';
import styles from './wallet.module.css';

export function BuyCourse({
  locale,
  price,
  name,
  priceError,
  onPurchased,
  onUnauthorized,
}: {
  locale: Locale;
  /** ราคาจาก GET /api/services · null ระหว่างโหลดหรือโหลดไม่ได้ */
  price: number | null;
  name: string;
  priceError: { code: string; message: string } | null;
  onPurchased: (course: CourseSummary) => void;
  onUnauthorized: () => void;
}) {
  const m = f6[locale];
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [purchased, setPurchased] = useState<CourseSummary | null>(null);
  const priceText = price === null ? '' : formatBaht(price, locale);

  async function purchase() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<PurchaseCourseResponse>('/api/courses/purchase', { locale, method: 'POST', body: {} });
      setPurchased(res.course);
      setConfirming(false);
      onPurchased(res.course);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setError(err instanceof ApiClientError ? { code: err.code, message: err.message } : { code: 'internal', message: m.genericError });
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className={styles.buy} data-testid="wallet-buy-panel">
      <p className="eyebrow">{m.buyEyebrow}</p>
      <h3>{name}</h3>
      {price !== null && (
        <p className={styles.buyPrice} data-testid="wallet-buy-price">
          {priceText}
        </p>
      )}
      <ul className={styles.buyTerms}>
        <li>{m.termSessions}</li>
        <li>{m.termValidity}</li>
        <li>{m.termNoDiscount}</li>
        <li>{m.termActive}</li>
        <li>{m.termSimulated}</li>
      </ul>

      {priceError && <ErrorMessage code={priceError.code} message={priceError.message} />}
      {error && <ErrorMessage code={error.code} message={error.message} />}
      {purchased && (
        <p role="status" className={styles.buySuccess} data-testid="wallet-buy-success">
          {format(m.buySuccess, { date: formatDate(purchased.expiresOn, locale) })}
        </p>
      )}

      {confirming ? (
        <div className={styles.buyConfirm} data-testid="wallet-buy-confirm-panel">
          <p className={styles.buyConfirmTitle}>{format(m.confirmTitle, { price: priceText })}</p>
          <p>{m.confirmBody}</p>
          <div className={styles.buyActions}>
            <Button testId="wallet-buy-course-confirm" variant="gold" disabled={busy} onClick={purchase}>
              {m.confirmYes}
            </Button>
            <Button testId="wallet-buy-course-cancel" variant="ghost-light" disabled={busy} onClick={() => setConfirming(false)}>
              {m.confirmNo}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          testId="wallet-buy-course"
          variant="gold"
          disabled={price === null}
          className={styles.buyButton}
          onClick={() => {
            setError(null);
            setPurchased(null);
            setConfirming(true);
          }}
        >
          {price === null ? m.buyEyebrow : format(m.buyButton, { price: priceText })}
        </Button>
      )}
    </aside>
  );
}
