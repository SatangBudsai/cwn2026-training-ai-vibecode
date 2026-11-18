'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, ErrorMessage, LinkButton, ThaiPattern } from '@/components/ui';
import { common } from '@/i18n/common';
import { f5 } from '@/i18n/f5';
import { format } from '@/i18n/locales';
import { api } from '@/lib/api-client';
import { formatBaht, formatDate } from '@/lib/format';
import type { BookingDetail, CancelResponse, Locale, MeResponse, MyBookingsResponse } from '@/types';
import { displayName, isUnauthorized, loginHref, toUiError, type UiError } from './helpers';
import { UpcomingBooking } from './UpcomingBooking';
import styles from './account.module.css';

function refundSummary(refunded: CancelResponse['refunded'], locale: Locale): string {
  const m = f5[locale];
  const parts: string[] = [];
  if (refunded.sessions > 0) parts.push(format(m.refundSessions, { n: refunded.sessions }));
  if (refunded.points > 0) parts.push(format(m.refundPoints, { n: refunded.points }));
  if (refunded.giftCardAmount > 0) parts.push(format(m.refundGiftCard, { amount: formatBaht(refunded.giftCardAmount, locale) }));
  if (refunded.birthday) parts.push(m.refundBirthday);
  return parts.join(' · ');
}

export function AccountView({ locale }: { locale: Locale }) {
  const m = f5[locale];
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [loadError, setLoadError] = useState<UiError | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<UiError | null>(null);
  const [cancelDone, setCancelDone] = useState<string | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState<UiError | null>(null);

  const toLogin = useCallback(() => router.replace(loginHref(locale, `/${locale}/account`)), [router, locale]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const [profile, mine] = await Promise.all([
          api<MeResponse>('/api/me', { locale, signal }),
          api<MyBookingsResponse>('/api/me/bookings', { locale, signal }),
        ]);
        if (signal?.aborted) return;
        setMe(profile);
        setBookings(mine.bookings);
        setLoadError(null);
      } catch (err) {
        if (signal?.aborted) return;
        if (isUnauthorized(err)) toLogin();
        else setLoadError(toUiError(err, m.networkError));
      }
    },
    [locale, m.networkError, toLogin],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function cancel(booking: BookingDetail) {
    setCancellingId(booking.id);
    setCancelError(null);
    setCancelDone(null);
    try {
      const { refunded } = await api<CancelResponse>(`/api/bookings/${booking.id}/cancel`, { locale, method: 'POST' });
      const summary = refundSummary(refunded, locale);
      const done = format(m.cancelDone, { code: booking.bookingCode });
      setCancelDone(summary ? `${done} · ${summary}` : done);
    } catch (err) {
      if (isUnauthorized(err)) {
        toLogin();
        return;
      }
      setCancelError(toUiError(err, m.networkError));
    }
    setConfirmingId(null);
    // โหลดใหม่ทั้งกรณีสำเร็จและไม่สำเร็จ: แต้มเปลี่ยน หรือสถานะนัดเปลี่ยนไปแล้ว (เช่นเลยเส้น 24 ชม.)
    await load();
    setCancellingId(null);
  }

  async function logout() {
    setLogoutBusy(true);
    setLogoutError(null);
    try {
      await api('/api/auth/logout', { locale, method: 'POST' });
      // ต้อง push ก่อน refresh: navigation ที่ตามมาจะทิ้ง refresh ที่ค้างอยู่ แล้ว header ไม่อัปเดต
      router.push(`/${locale}`);
      router.refresh();
    } catch (err) {
      setLogoutError(toUiError(err, m.networkError));
      setLogoutBusy(false);
    }
  }

  const hero = (
    <header className={styles.hero}>
      <ThaiPattern tone="light" />
      <div className={`container ${styles.heroInner}`}>
        <p className="eyebrow">{m.accountEyebrow}</p>
        <h1 data-testid="account-title">{m.accountTitle}</h1>
        <p className={styles.heroSub}>{m.accountSub}</p>
      </div>
    </header>
  );

  if (!me) {
    return (
      <div data-testid="account-page">
        {hero}
        <div className={`container ${styles.stateBox}`}>
          {loadError ? (
            <>
              <ErrorMessage code={loadError.code} message={loadError.message} />
              <Button testId="account-retry" variant="ghost" size="sm" onClick={() => void load()}>
                {m.retry}
              </Button>
            </>
          ) : (
            <p data-testid="account-loading">{common[locale].loading}</p>
          )}
        </div>
      </div>
    );
  }

  const isOwner = me.role === 'OWNER';
  const name = displayName(me.fullName, locale);
  const next = me.nextTier;

  return (
    <div data-testid="account-page">
      {hero}
      <div className="container">
        {isOwner ? (
          <div className={styles.memberCard}>
            <ThaiPattern tone="light" />
            <div className={styles.memberInner}>
              <p className={styles.ownerNote} data-testid="account-owner-note">{m.ownerNote}</p>
              <div>
                <LinkButton testId="account-admin" href={`/${locale}/admin`} variant="gold">
                  {m.adminLink}
                </LinkButton>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.memberCard}>
            <ThaiPattern tone="light" />
            <div className={styles.memberInner}>
              <dl className={styles.memberGrid}>
                <div className={styles.memberTier}>
                  <dt className={styles.statLabel}>{m.tierLabel}</dt>
                  <dd className={styles.tierValue} data-testid="account-tier">{me.tier}</dd>
                </div>
                <div>
                  <dt className={styles.statLabel}>{m.spendLabel}</dt>
                  <dd className={styles.statValue} data-testid="account-spend" data-value={me.lifetimeSpend}>{formatBaht(me.lifetimeSpend, locale)}</dd>
                </div>
                <div>
                  <dt className={styles.statLabel}>{m.pointsLabel}</dt>
                  <dd className={styles.statValue} data-testid="account-points" data-value={me.pointsBalance}>{me.pointsBalance.toLocaleString('en-US')}</dd>
                </div>
              </dl>
              {next && (
                <div className={styles.nextTier}>
                  <div className={styles.track} aria-hidden="true">
                    <span className={styles.trackFill} style={{ width: `${(me.lifetimeSpend / (me.lifetimeSpend + next.gap)) * 100}%` }} />
                  </div>
                  <p data-testid="account-next-tier">{format(m.nextTier, { gap: formatBaht(next.gap, locale), tier: next.name })}</p>
                </div>
              )}
              <p className={styles.lifetimeNote} data-testid="account-lifetime-note">{m.lifetimeNote}</p>
            </div>
          </div>
        )}

        <div className={isOwner ? styles.columnsSolo : styles.columns}>
          {!isOwner && (
            <section className={styles.upcoming} aria-labelledby="account-upcoming-title">
              <h2 id="account-upcoming-title" className={styles.sectionTitle}>{m.upcomingTitle}</h2>
              <span aria-hidden="true" className={styles.rule} />

              {cancelDone && <p role="status" className={styles.success} data-testid="account-cancel-done">{cancelDone}</p>}
              {cancelError && <ErrorMessage code={cancelError.code} message={cancelError.message} />}
              {loadError && <ErrorMessage code={loadError.code} message={loadError.message} />}

              {bookings.length === 0 ? (
                <div className={styles.emptyUpcoming} data-testid="account-upcoming-empty">
                  <p>{m.upcomingEmpty}</p>
                  <div>
                    <LinkButton testId="account-book" href={`/${locale}/booking`} variant="gold">
                      {m.bookNow}
                    </LinkButton>
                  </div>
                </div>
              ) : (
                <div className={styles.bookingList} data-testid="account-bookings">
                  {bookings.map((b) => (
                    <UpcomingBooking
                      key={b.id}
                      booking={b}
                      locale={locale}
                      confirming={confirmingId === b.id}
                      busy={cancellingId === b.id}
                      onAsk={() => {
                        setConfirmingId(b.id);
                        setCancelError(null);
                        setCancelDone(null);
                      }}
                      onKeep={() => setConfirmingId(null)}
                      onConfirm={() => void cancel(b)}
                    />
                  ))}
                </div>
              )}

              <p className={styles.noReschedule} data-testid="account-no-reschedule">{m.noReschedule}</p>
            </section>
          )}

          <aside className={styles.aside}>
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>{m.profileTitle}</h2>
              <dl className={styles.profile}>
                {name && (
                  <div>
                    <dt>{m.nameLabel}</dt>
                    <dd data-testid="account-name">{name}</dd>
                  </div>
                )}
                <div>
                  <dt>{m.emailLabel}</dt>
                  <dd data-testid="account-email">{me.email}</dd>
                </div>
                <div>
                  <dt>{m.phoneLabel}</dt>
                  <dd data-testid="account-phone">{me.phone}</dd>
                </div>
                {me.birthDate && (
                  <div>
                    <dt>{m.birthLabel}</dt>
                    <dd>
                      <span data-testid="account-birth-date">{formatDate(me.birthDate, locale)}</span>
                      <span className={styles.readonlyTag} data-testid="account-birth-readonly">{m.birthReadonly}</span>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className={styles.panel}>
              {!isOwner && (
                <>
                  <LinkButton testId="account-history-link" href={`/${locale}/account/history`} variant="ghost" className={styles.fullBtn}>
                    {m.historyLink}
                  </LinkButton>
                  <LinkButton testId="account-wallet-link" href={`/${locale}/wallet`} variant="ghost" className={styles.fullBtn}>
                    {m.walletLink}
                  </LinkButton>
                </>
              )}
              {logoutError && <ErrorMessage code={logoutError.code} message={logoutError.message} />}
              <Button testId="account-logout" variant="danger" className={styles.fullBtn} disabled={logoutBusy} onClick={() => void logout()}>
                {logoutBusy ? m.logoutBusy : m.logout}
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
