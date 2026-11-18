'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isAbort, toUiError, type UiError } from '@/components/shuttle/to-ui-error';
import { Button, ErrorMessage } from '@/components/ui';
import { common } from '@/i18n/common';
import { f7 } from '@/i18n/f7';
import { format } from '@/i18n/locales';
import { api } from '@/lib/api-client';
import { formatBaht, formatDate } from '@/lib/format';
import type { GetGiftCardResponse, GiftCardDesign, GiftCardSummary, Locale } from '@/types';
import { GiftCardArt } from './GiftCardArt';
import styles from './giftcard.module.css';

function statusOf(card: GiftCardSummary): 'expired' | 'empty' | 'active' {
  if (card.expired) return 'expired';
  return card.balance <= 0 ? 'empty' : 'active';
}

/** FR-49: ยอดคงเหลือ วันหมดอายุ และสถานะ มาจาก API ทั้งหมด */
export function GiftCardCheck({ locale }: { locale: Locale }) {
  const m = f7[locale];
  const designName: Record<GiftCardDesign, string> = {
    ORCHID: m.gcDesignORCHID,
    LOTUS: m.gcDesignLOTUS,
    GOLD: m.gcDesignGOLD,
  };
  const statusText = { active: m.gcStatusActive, empty: m.gcStatusEmpty, expired: m.gcStatusExpired };

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [card, setCard] = useState<GiftCardSummary | null>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setCard(null);
    const trimmed = code.trim();
    if (!trimmed) {
      setError({ code: 'giftcard-code-required', message: m.gcCheckEmpty });
      return;
    }
    const ctrl = new AbortController();
    pending.current = ctrl;
    setBusy(true);
    try {
      const data = await api<GetGiftCardResponse>(`/api/gift-cards/${encodeURIComponent(trimmed)}`, { locale, signal: ctrl.signal });
      setCard(data.giftCard);
    } catch (err) {
      if (isAbort(err)) return;
      setError(toUiError(err, locale));
    }
    setBusy(false);
  };

  const status = card ? statusOf(card) : null;

  return (
    <div className={styles.check}>
      <form className={styles.checkForm} onSubmit={onSubmit} noValidate data-testid="giftcard-check-form">
        <div className={`field ${styles.checkField}`}>
          <label htmlFor="giftcard-check-code">{m.gcCheckLabel}</label>
          <input
            id="giftcard-check-code"
            className="input"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder={m.gcCheckPlaceholder}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            data-testid="giftcard-check-code"
          />
        </div>
        <Button testId="giftcard-check-submit" type="submit" disabled={busy} className={styles.checkSubmit}>
          {busy ? m.gcCheckSubmitting : m.gcCheckSubmit}
        </Button>
      </form>

      <div aria-live="polite">
        {error && <ErrorMessage code={error.code} message={error.message} />}
        {card && status && (
          <div className={styles.checkResult} data-testid="giftcard-check-result">
            <GiftCardArt
              design={card.design}
              alt={format(m.gcCardAlt, { design: designName[card.design] })}
              sizes="(min-width: 920px) 300px, calc(100vw - 64px)"
              brand={common[locale].brandName}
              label={m.gcCardLabel}
              value={formatBaht(card.initialValue, locale)}
              caption={card.code}
            />
            <dl className={styles.facts}>
              <div className={styles.factWide}>
                <dt>{m.gcCheckBalance}</dt>
                <dd className={styles.balance} data-testid="giftcard-check-balance">{formatBaht(card.balance, locale)}</dd>
              </div>
              <div>
                <dt>{m.gcCheckInitial}</dt>
                <dd data-testid="giftcard-check-initial">{formatBaht(card.initialValue, locale)}</dd>
              </div>
              <div>
                <dt>{m.gcCheckExpires}</dt>
                <dd data-testid="giftcard-check-expires" data-date={card.expiresOn}>{formatDate(card.expiresOn, locale)}</dd>
              </div>
              <div>
                <dt>{m.gcCheckStatus}</dt>
                <dd>
                  <span className={styles[`status-${status}`]} data-testid="giftcard-check-status" data-status={status}>
                    {statusText[status]}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
