'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isAbort, toUiError, type UiError } from '@/components/shuttle/to-ui-error';
import { Button, ErrorMessage, LinkButton, SmartImage } from '@/components/ui';
import { common } from '@/i18n/common';
import { f7 } from '@/i18n/f7';
import { format } from '@/i18n/locales';
import { api } from '@/lib/api-client';
import { formatBaht, formatDate } from '@/lib/format';
import type {
  CreateGiftCardRequest,
  CreateGiftCardResponse,
  DeliveryChannel,
  GiftCardDesign,
  Locale,
} from '@/types';
import { DESIGN_IMAGES, GiftCardArt } from './GiftCardArt';
import styles from './giftcard.module.css';

const DESIGNS: GiftCardDesign[] = ['ORCHID', 'LOTUS', 'GOLD'];
const CHANNELS: DeliveryChannel[] = ['LINE', 'EMAIL'];
const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];
// ตรงกับเพดานของ API จึงไม่เจอ validation จากความยาว
const RECIPIENT_MAX = 200;
const MESSAGE_MAX = 500;

/** แสดงตัวอย่างเท่านั้น ไม่ปัดค่า: ไม่ใช่จำนวนเต็มล้วนก็แสดงตามที่พิมพ์ · ค่าที่ส่งให้ API คือข้อความเดิม */
function previewAmount(text: string, empty: string, locale: Locale): string {
  const t = text.trim();
  if (!t) return empty;
  return /^[1-9]\d{0,8}$/.test(t) ? formatBaht(Number(t), locale) : (locale === 'zh' ? `${t} 泰铢` : `฿${t}`);
}

export function GiftCardPurchase({ locale }: { locale: Locale }) {
  const m = f7[locale];
  const brand = common[locale].brandName;
  const designName: Record<GiftCardDesign, string> = {
    ORCHID: m.gcDesignORCHID,
    LOTUS: m.gcDesignLOTUS,
    GOLD: m.gcDesignGOLD,
  };

  const [design, setDesign] = useState<GiftCardDesign>('ORCHID');
  const [amount, setAmount] = useState('');
  const [channel, setChannel] = useState<DeliveryChannel>('LINE');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [result, setResult] = useState<CreateGiftCardResponse | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ block: 'center' });
  }, [result]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const ctrl = new AbortController();
    pending.current = ctrl;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body: CreateGiftCardRequest = {
        amount,
        design,
        channel,
        recipient: recipient.trim() || undefined,
        message: message.trim() || undefined,
      };
      const created = await api<CreateGiftCardResponse>('/api/gift-cards', { locale, body, signal: ctrl.signal });
      setResult(created);
      // ล้างฟอร์มกันกดซื้อซ้ำโดยไม่ตั้งใจ
      setAmount('');
      setRecipient('');
      setMessage('');
    } catch (err) {
      if (isAbort(err)) return;
      setError(toUiError(err, locale));
    }
    setBusy(false);
  };

  const shownAmount = previewAmount(amount, m.gcAmountEmpty, locale);
  const card = result?.giftCard;

  return (
    <>
      <div className={styles.studio}>
        <div className={styles.previewCol} data-testid="giftcard-preview">
          <p className={styles.previewLabel}>{m.gcPreviewLabel}</p>
          <GiftCardArt
            design={design}
            alt={format(m.gcCardAlt, { design: designName[design] })}
            sizes="(min-width: 920px) 560px, calc(100vw - 32px)"
            brand={brand}
            label={m.gcCardLabel}
            value={<span data-testid="giftcard-preview-amount">{shownAmount}</span>}
          />
        </div>

        <form className={styles.form} onSubmit={onSubmit} noValidate data-testid="giftcard-form">
          <fieldset className={styles.step}>
            <legend className={styles.stepTitle}>
              <span className={styles.stepNo} aria-hidden="true">1</span>
              {m.gcStepDesign}
            </legend>
            <div className={styles.designs}>
              {DESIGNS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={design === d ? styles.designOn : styles.design}
                  aria-pressed={design === d}
                  onClick={() => setDesign(d)}
                  data-testid={`giftcard-design-${d}`}
                >
                  <SmartImage src={DESIGN_IMAGES[d]} alt="" sizes="(min-width: 920px) 170px, 30vw" ratio="3 / 2" />
                  <span className={styles.designName}>{designName[d]}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.step}>
            <legend className={styles.stepTitle}>
              <span className={styles.stepNo} aria-hidden="true">2</span>
              {m.gcStepAmount}
            </legend>
            <div className="field">
              <label htmlFor="giftcard-amount">{m.gcAmountLabel}</label>
              <input
                id="giftcard-amount"
                className={`input ${styles.amountInput}`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={m.gcAmountPlaceholder}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="giftcard-amount"
              />
              <span className={styles.hint}>{m.gcAmountHint}</span>
            </div>
            <div className={styles.quick} role="group" aria-label={m.gcQuickLabel}>
              {QUICK_AMOUNTS.map((n) => (
                <Button
                  key={n}
                  testId={`giftcard-amount-${n}`}
                  variant={amount === String(n) ? 'primary' : 'ghost'}
                  size="sm"
                  aria-pressed={amount === String(n)}
                  onClick={() => setAmount(String(n))}
                >
                  {formatBaht(n, locale)}
                </Button>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.step}>
            <legend className={styles.stepTitle}>
              <span className={styles.stepNo} aria-hidden="true">3</span>
              {m.gcStepDelivery}
            </legend>
            <div className={styles.channels} role="group" aria-label={m.gcChannelLabel}>
              {CHANNELS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={channel === c ? styles.channelOn : styles.channel}
                  aria-pressed={channel === c}
                  onClick={() => setChannel(c)}
                  data-testid={`giftcard-channel-${c}`}
                >
                  {c === 'LINE' ? m.gcChannelLine : m.gcChannelEmail}
                </button>
              ))}
            </div>
            <div className="field">
              <label htmlFor="giftcard-recipient">{channel === 'LINE' ? m.gcRecipientLine : m.gcRecipientEmail}</label>
              <input
                id="giftcard-recipient"
                className="input"
                type="text"
                autoComplete="off"
                maxLength={RECIPIENT_MAX}
                placeholder={channel === 'LINE' ? m.gcRecipientPlaceholderLine : m.gcRecipientPlaceholderEmail}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                data-testid="giftcard-recipient"
              />
            </div>
            <div className="field">
              <label htmlFor="giftcard-message">{m.gcMessageLabel}</label>
              <textarea
                id="giftcard-message"
                className="textarea"
                rows={3}
                maxLength={MESSAGE_MAX}
                placeholder={m.gcMessagePlaceholder}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                data-testid="giftcard-message"
              />
            </div>
            <p className={styles.hint}>{m.gcDeliveryNote}</p>
          </fieldset>

          <fieldset className={styles.step}>
            <legend className={styles.stepTitle}>
              <span className={styles.stepNo} aria-hidden="true">4</span>
              {m.gcStepPay}
            </legend>
            <div className={styles.payRow}>
              <span>{m.gcPayTotal}</span>
              <strong data-testid="giftcard-pay-total">{shownAmount}</strong>
            </div>
            <p className={styles.payNote} data-testid="giftcard-simulated-note">
              {m.gcPayNote}
            </p>
            {error && <ErrorMessage code={error.code} message={error.message} />}
            <Button testId="giftcard-submit" type="submit" variant="gold" size="lg" disabled={busy} className={styles.submit}>
              {busy ? m.gcSubmitting : m.gcSubmit}
            </Button>
          </fieldset>
        </form>
      </div>

      <div aria-live="polite">
        {card && result && (
          <div ref={resultRef} className={styles.result} data-testid="giftcard-result">
            <GiftCardArt
              design={card.design}
              alt={format(m.gcCardAlt, { design: designName[card.design] })}
              sizes="(min-width: 920px) 520px, calc(100vw - 64px)"
              brand={brand}
              label={m.gcCardLabel}
              value={formatBaht(card.initialValue, locale)}
              caption={card.code}
            />
            <div className={styles.resultBody}>
              <span className="badge badge-gold" data-testid="giftcard-result-status">
                {m.gcResultBadge}
              </span>
              <h3>{m.gcResultTitle}</h3>
              <dl className={styles.facts}>
                <div>
                  <dt>{m.gcResultCode}</dt>
                  <dd className={styles.code} data-testid="giftcard-result-code">{card.code}</dd>
                </div>
                <div>
                  <dt>{m.gcResultValue}</dt>
                  <dd data-testid="giftcard-result-value">{formatBaht(card.initialValue, locale)}</dd>
                </div>
                <div>
                  <dt>{m.gcResultDesign}</dt>
                  <dd data-testid="giftcard-result-design">{designName[card.design]}</dd>
                </div>
                <div>
                  <dt>{m.gcResultChannel}</dt>
                  <dd data-testid="giftcard-result-channel">{card.channel === 'LINE' ? m.gcChannelLine : m.gcChannelEmail}</dd>
                </div>
                <div>
                  <dt>{m.gcResultExpires}</dt>
                  <dd data-testid="giftcard-result-expires" data-date={card.expiresOn}>{formatDate(card.expiresOn, locale)}</dd>
                </div>
              </dl>
              <div className={styles.simulated}>
                <p className={styles.simulatedLabel}>{m.gcResultMessage}</p>
                <p data-testid="giftcard-result-message">{result.simulatedMessage}</p>
              </div>
              <LinkButton testId="giftcard-result-book" href={`/${locale}/booking`} variant="primary" className={styles.resultCta}>
                {m.gcResultBook}
              </LinkButton>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
