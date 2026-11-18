'use client';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ShuttlePicker } from '@/components/shuttle/ShuttlePicker';
import { Button, ErrorMessage } from '@/components/ui';
import { common } from '@/i18n/common';
import { f4 } from '@/i18n/f4';
import { format } from '@/i18n/locales';
import { formatBaht, formatDate } from '@/lib/format';
import type { BirthdayReason, Hotel, Locale, QuoteResponse, Service, ShuttleInput } from '@/types';
import { PriceSummary } from './PriceSummary';
import { Recap } from './Recap';
import type { UiError } from './use-api-resource';
import styles from './booking.module.css';

type ExtraKey = 'points' | 'birthday' | 'shuttle' | 'giftcard';

/** error ของ quote แสดงในส่วนเสริมที่เกี่ยวข้อง · ที่เหลือแสดงรวมเหนือปุ่มยืนยัน */
function errorTarget(code: string): ExtraKey | null {
  if (code.startsWith('points-')) return 'points';
  if (code.startsWith('distance-') || code === 'hotel-not-found') return 'shuttle';
  if (code.startsWith('giftcard-')) return 'giftcard';
  return null;
}

export interface ScreenSummaryProps {
  locale: Locale;
  service: Service;
  party: number;
  courseMode: boolean;
  date: string;
  time: string;
  therapistLabel: string;
  isMember: boolean;
  quote: QuoteResponse | null;
  quoteError: UiError | null;
  quoteLoading: boolean;
  hotels: Hotel[];
  pointsSets: number;
  useBirthday: boolean;
  shuttle: ShuttleInput | null;
  giftDraft: string;
  giftCode: string;
  guestName: string;
  guestPhone: string;
  loginHref: string;
  confirmError: UiError | null;
  slotTaken: boolean;
  submitting: boolean;
  onPointsSets: (n: number) => void;
  onBirthday: (v: boolean) => void;
  onShuttle: (v: ShuttleInput | null) => void;
  onGiftDraft: (v: string) => void;
  onGiftApply: () => void;
  onGiftRemove: () => void;
  onGuestName: (v: string) => void;
  onGuestPhone: (v: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}

export function ScreenSummary(props: ScreenSummaryProps) {
  const { locale, service, party, courseMode, date, time, therapistLabel, isMember, quote, quoteError, quoteLoading, hotels, pointsSets, useBirthday, shuttle, giftDraft, giftCode, guestName, guestPhone, loginHref, confirmError, slotTaken, submitting } = props;
  const m = f4[locale];
  const required = service.id === 'P01';
  const [open, setOpen] = useState<Record<ExtraKey, boolean>>({ points: false, birthday: false, shuttle: false, giftcard: false });
  const toggle = (k: ExtraKey) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const target = quoteError ? errorTarget(quoteError.code) : null;
  const isOpen = (k: ExtraKey) => open[k] || target === k;
  const generalQuoteError = quoteError && (target === null || (target === 'points' && !isMember)) ? quoteError : null;
  const panelError = (k: ExtraKey) => (quoteError && target === k ? quoteError : null);
  // ถ้า error เดียวกันแสดงอยู่แล้วจาก quote ไม่แสดงซ้ำ · testid ต้องไม่ซ้ำ
  const visibleConfirmError = confirmError && confirmError.code !== quoteError?.code ? confirmError : null;

  const canConfirm = quote !== null && !quoteLoading && !quoteError && !slotTaken && !submitting;
  const maxSets = quote?.points.maxSets ?? 0;

  const birthdayReason = (r: BirthdayReason): string | null => {
    if (r === 'guest') return m.birthdayReasonGuest;
    if (r === 'not-birthday-month') return m.birthdayReasonMonth;
    if (r === 'already-used') return m.birthdayReasonUsed;
    if (r === 'service-not-eligible') return m.birthdayReasonService;
    return null;
  };

  return (
    <section data-testid="booking-screen-3" className={styles.screen}>
      <h2 className={styles.screenTitle}>{m.s3Title}</h2>
      <div className={styles.summaryLayout}>
        <aside className={styles.summaryAside}>
          <div className={styles.receipt}>
            <Recap locale={locale} service={service} party={party} courseMode={courseMode} date={date} time={time} therapistLabel={therapistLabel} />
            <h3 className={styles.blockTitle}>{m.linesTitle}</h3>
            {quote ? (
              <PriceSummary locale={locale} lines={quote.lines} partySize={party} tier={quote.tier} dim={quoteLoading || quoteError !== null} />
            ) : quoteError ? (
              <p className={styles.note} data-testid="booking-quote-need-input">
                {m.quoteNeedInput}
              </p>
            ) : (
              <div className={styles.receiptSkeleton} data-testid="booking-quote-loading" role="status" aria-label={common[locale].loading} />
            )}
            {quote && quoteError && (
              <p className={styles.staleNote} data-testid="booking-quote-stale">
                {m.quoteStale}
              </p>
            )}
            <p className={styles.note} data-testid="booking-no-online-payment">
              {m.noOnlinePayment}
            </p>
          </div>
        </aside>

        <div className={styles.summaryMain}>
          <div className={styles.block}>
            <h3 className={styles.blockTitle}>{m.extrasTitle}</h3>
            <p className={styles.note}>{m.extrasOptional}</p>

            <div className={styles.extras}>
              {isMember && (
                <Extra
                  id="points"
                  label={m.extraPoints}
                  on={pointsSets > 0}
                  onLabel={m.extraOn}
                  open={isOpen('points')}
                  onToggle={() => toggle('points')}
                >
                  {maxSets > 0 ? (
                    <p className={styles.note} data-testid="booking-points-balance">
                      {format(m.pointsBalance, { balance: quote?.points.balance ?? 0, max: maxSets })}
                    </p>
                  ) : (
                    <p className={styles.note} data-testid="booking-points-none">
                      {m.pointsNone}
                    </p>
                  )}
                  <div className={styles.stepper}>
                    <Button testId="booking-points-dec" variant="ghost" size="sm" aria-label={m.pointsDec} disabled={pointsSets <= 0} onClick={() => props.onPointsSets(pointsSets - 1)}>
                      −
                    </Button>
                    <output className={styles.stepperValue} data-testid="booking-points-value" data-points={pointsSets * 100}>
                      {format(m.pointsValue, { sets: pointsSets, points: pointsSets * 100 })}
                    </output>
                    <Button testId="booking-points-inc" variant="ghost" size="sm" aria-label={m.pointsInc} disabled={pointsSets >= maxSets} onClick={() => props.onPointsSets(pointsSets + 1)}>
                      +
                    </Button>
                    <Button testId="booking-points-max" variant="ghost" size="sm" disabled={maxSets <= 0} onClick={() => props.onPointsSets(maxSets)}>
                      {m.pointsMax}
                    </Button>
                  </div>
                  {panelError('points') && <ErrorMessage {...panelError('points')!} />}
                </Extra>
              )}

              {quote?.birthday.offered && (
                <Extra
                  id="birthday"
                  label={m.extraBirthday}
                  on={useBirthday}
                  onLabel={m.extraOn}
                  open={isOpen('birthday')}
                  onToggle={() => toggle('birthday')}
                >
                  <label className={styles.checkRow}>
                    <input type="checkbox" data-testid="booking-use-birthday" checked={useBirthday} onChange={(e) => props.onBirthday(e.target.checked)} />
                    <span>{m.birthdayUse}</span>
                  </label>
                  {!quote.birthday.eligible && (
                    <p className={styles.note} data-testid="booking-birthday-reason">
                      {birthdayReason(quote.birthday.reason)}
                    </p>
                  )}
                  {useBirthday && quote.birthday.eligible && (
                    <p className={styles.note} data-testid="booking-birthday-result">
                      {quote.birthday.applied ? m.birthdayApplied : m.birthdayNotBest}
                    </p>
                  )}
                </Extra>
              )}

              {required ? (
                <div className={styles.extra} data-testid="booking-extra-shuttle">
                  <p className={styles.extraStaticTitle}>{m.extraShuttle}</p>
                  <div className={styles.extraBody}>
                    <p className={styles.note}>{m.shuttlePackageNote}</p>
                    <ShuttlePicker locale={locale} hotels={hotels} required value={shuttle} onChange={props.onShuttle} error={panelError('shuttle')} testIdPrefix="booking-shuttle" />
                  </div>
                </div>
              ) : (
                <Extra
                  id="shuttle"
                  label={m.extraShuttle}
                  on={shuttle !== null}
                  onLabel={m.extraOn}
                  open={isOpen('shuttle')}
                  onToggle={() => toggle('shuttle')}
                >
                  <ShuttlePicker locale={locale} hotels={hotels} value={shuttle} onChange={props.onShuttle} error={panelError('shuttle')} testIdPrefix="booking-shuttle" />
                </Extra>
              )}

              <Extra
                id="giftcard"
                label={m.extraGiftCard}
                on={giftCode !== ''}
                onLabel={m.extraOn}
                open={isOpen('giftcard')}
                onToggle={() => toggle('giftcard')}
              >
                <div className="field">
                  <label htmlFor="booking-giftcard-code">{m.giftLabel}</label>
                  <div className={styles.giftRow}>
                    <input
                      id="booking-giftcard-code"
                      className="input"
                      data-testid="booking-giftcard-code"
                      value={giftDraft}
                      autoComplete="off"
                      onChange={(e) => props.onGiftDraft(e.target.value)}
                    />
                    <Button testId="booking-giftcard-apply" variant="ghost" disabled={giftDraft.trim() === ''} onClick={props.onGiftApply}>
                      {m.giftApply}
                    </Button>
                  </div>
                </div>
                {quote?.giftCard && !panelError('giftcard') && (
                  <p className={styles.note} data-testid="booking-giftcard-info">
                    {format(m.giftInfo, {
                      before: formatBaht(quote.giftCard.balanceBefore, locale),
                      used: formatBaht(quote.giftCard.amountUsed, locale),
                      after: formatBaht(quote.giftCard.balanceAfter, locale),
                      date: formatDate(quote.giftCard.expiresOn, locale),
                    })}
                  </p>
                )}
                {panelError('giftcard') && <ErrorMessage {...panelError('giftcard')!} />}
                {giftCode !== '' && (
                  <div>
                    <Button testId="booking-giftcard-remove" variant="ghost" size="sm" onClick={props.onGiftRemove}>
                      {m.giftRemove}
                    </Button>
                  </div>
                )}
              </Extra>
            </div>
          </div>

          {isMember ? (
            <div className={styles.block} data-testid="booking-member-note">
              {quote?.tier && <p className={styles.note}>{format(m.memberNote, { tier: quote.tier })}</p>}
              {quote && quote.pointsEarnedPreview > 0 && (
                <p className={styles.note} data-testid="booking-points-earned">
                  {format(m.pointsEarned, { n: quote.pointsEarnedPreview })}
                </p>
              )}
            </div>
          ) : (
            <div className={styles.block}>
              <h3 className={styles.blockTitle}>{m.guestTitle}</h3>
              <div className={styles.guestGrid}>
                <div className="field">
                  <label htmlFor="booking-guest-name">{m.guestName}</label>
                  <input
                    id="booking-guest-name"
                    className="input"
                    data-testid="booking-guest-name"
                    autoComplete="name"
                    value={guestName}
                    onChange={(e) => props.onGuestName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="booking-guest-phone">{m.guestPhone}</label>
                  <input
                    id="booking-guest-phone"
                    className="input"
                    data-testid="booking-guest-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={guestPhone}
                    onChange={(e) => props.onGuestPhone(e.target.value)}
                  />
                </div>
              </div>
              <p className={styles.note} data-testid="booking-guest-note">
                {m.guestNote}
              </p>
              <Link href={loginHref} data-testid="booking-login-link" className={styles.inlineLink}>
                {m.guestLogin}
              </Link>
            </div>
          )}

          <div className={styles.confirmBox}>
            {quote?.under24h && (
              <p className={styles.warning} role="status" data-testid="booking-under24h-warning">
                {m.under24h}
              </p>
            )}
            {generalQuoteError && <ErrorMessage {...generalQuoteError} />}
            {visibleConfirmError && <ErrorMessage {...visibleConfirmError} />}
            {quote && (
              <p className={styles.confirmAmount}>
                <span>{m.payLabel}</span>
                <strong data-testid="booking-confirm-amount">{formatBaht(quote.lines.payAtShop, locale)}</strong>
              </p>
            )}
            <div className={styles.actionRow}>
              <Button testId={slotTaken ? 'booking-back-to-slots' : 'booking-step3-back'} variant={slotTaken ? 'primary' : 'ghost'} onClick={props.onBack}>
                {slotTaken ? m.chooseNewTime : m.backToSchedule}
              </Button>
              <Button testId="booking-confirm" variant="gold" size="lg" className={styles.actionMain} disabled={!canConfirm} onClick={props.onConfirm}>
                {submitting ? m.confirming : m.confirm}
              </Button>
            </div>
            <p className={styles.note} data-testid="booking-no-reschedule">
              {m.noReschedule}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Extra({ id, label, on, onLabel, open, onToggle, children }: {
  id: ExtraKey;
  label: string;
  on: boolean;
  onLabel: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panelId = `booking-extra-panel-${id}`;
  return (
    <div className={styles.extra} data-testid={`booking-extra-${id}`}>
      <button type="button" className={styles.extraToggle} data-testid={`booking-toggle-${id}`} aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        <span>{label}</span>
        <span className={styles.extraState}>
          {on && <span className="badge badge-gold">{onLabel}</span>}
          <span aria-hidden="true" className={open ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron} />
        </span>
      </button>
      {open && (
        <div id={panelId} className={styles.extraBody}>
          {children}
        </div>
      )}
    </div>
  );
}
