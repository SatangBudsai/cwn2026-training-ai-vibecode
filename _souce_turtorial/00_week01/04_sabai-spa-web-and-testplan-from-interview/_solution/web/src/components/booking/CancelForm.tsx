'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button, ErrorMessage, LinkButton } from '@/components/ui';
import { f4 } from '@/i18n/f4';
import { format, pick } from '@/i18n/locales';
import { api } from '@/lib/api-client';
import { formatBaht, formatDate } from '@/lib/format';
import type { CancelGuestRequest, CancelResponse, Locale } from '@/types';
import { toUiError, type UiError } from './use-api-resource';
import styles from './booking.module.css';

export function CancelForm({ locale, initialCode }: { locale: Locale; initialCode: string }) {
  const m = f4[locale];
  const [code, setCode] = useState(initialCode);
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [result, setResult] = useState<CancelResponse | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const body: CancelGuestRequest = { bookingCode: code.trim(), phone: phone.trim() };
    try {
      setResult(await api<CancelResponse>('/api/bookings/cancel-guest', { locale, body }));
    } catch (err) {
      setError(toUiError(err, locale));
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const b = result.booking;
    return (
      <div className={styles.cancelResult} data-testid="cancel-result" role="status">
        <h2 className={styles.screenTitle}>{m.cancelDone}</h2>
        <dl className={styles.doneFacts}>
          <div>
            <dt>{m.codeLabel}</dt>
            <dd data-testid="cancel-result-code">{b.bookingCode}</dd>
          </div>
          <div>
            <dt>{m.serviceLabel}</dt>
            <dd data-testid="cancel-result-service">{pick(b.serviceName, locale)}</dd>
          </div>
          <div>
            <dt>{m.whenLabel}</dt>
            <dd data-testid="cancel-result-when">
              {formatDate(b.date, locale)} · {b.time}
            </dd>
          </div>
        </dl>
        {result.refunded.giftCardAmount > 0 && (
          <p className={styles.note} data-testid="cancel-refund-giftcard">
            {format(m.cancelRefundGift, { amount: formatBaht(result.refunded.giftCardAmount, locale) })}
          </p>
        )}
        <div className={styles.doneActions}>
          <LinkButton testId="cancel-rebook" href={`/${locale}/booking`}>
            {m.cancelRebook}
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.cancelForm} onSubmit={submit} noValidate data-testid="cancel-form">
      <div className="field">
        <label htmlFor="cancel-code">{m.cancelCode}</label>
        <input
          id="cancel-code"
          className="input"
          data-testid="cancel-code"
          autoComplete="off"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="cancel-phone">{m.cancelPhone}</label>
        <input
          id="cancel-phone"
          className="input"
          data-testid="cancel-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      {error && <ErrorMessage code={error.code} message={error.message} />}
      {error?.code === 'cancel-too-late' && (
        <a href="tel:021234567" data-testid="cancel-call-shop" className={styles.callLink}>
          {m.callNow}
        </a>
      )}
      <Button testId="cancel-submit" type="submit" variant="danger" size="lg" disabled={submitting}>
        {submitting ? m.cancelling : m.cancelSubmit}
      </Button>
      <p className={styles.note} data-testid="cancel-rule">
        {m.cancelRule}
      </p>
      <p className={styles.note}>
        {m.cancelMember}{' '}
        <Link href={`/${locale}/account`} data-testid="cancel-account-link" className={styles.inlineLink}>
          {m.cancelMemberLink}
        </Link>
      </p>
    </form>
  );
}
