'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Card, ErrorMessage, LinkButton, Section, SmartImage, ThaiPattern } from '@/components/ui';
import { common } from '@/i18n/common';
import { f6 } from '@/i18n/f6';
import { format, pick } from '@/i18n/locales';
import { api, ApiClientError } from '@/lib/api-client';
import { formatBaht, formatDate } from '@/lib/format';
import type { AdminBooking, AdminScheduleResponse, CompleteBookingResponse, Locale } from '@/types';
import styles from './admin.module.css';

/** ช่วงอักษรไทยตาม NFR-07 */
const THAI_CHARS = /[฀-๿]/;

interface ShownError {
  code: string;
  message: string;
}

type Access = 'ok' | 'login' | 'forbidden';

export function AdminBoard({ locale }: { locale: Locale }) {
  const m = f6[locale];
  const [access, setAccess] = useState<Access>('ok');
  const [accessError, setAccessError] = useState<ShownError | null>(null);
  const [date, setDate] = useState('');
  const [data, setData] = useState<AdminScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ShownError | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, CompleteBookingResponse>>({});
  const [actionError, setActionError] = useState<(ShownError & { bookingCode: string }) | null>(null);
  const requestId = useRef(0);

  const toShown = useCallback(
    (err: unknown): ShownError =>
      err instanceof ApiClientError ? { code: err.code, message: err.message } : { code: 'internal', message: m.genericError },
    [m.genericError],
  );

  /** 401 และ 403 ล้างข้อมูลทั้งหมดทันที ไม่ให้เห็นคิว (NFR-12) */
  const denyIfNeeded = useCallback((err: unknown): boolean => {
    if (!(err instanceof ApiClientError) || (err.status !== 401 && err.status !== 403)) return false;
    setData(null);
    setAccess(err.status === 401 ? 'login' : 'forbidden');
    setAccessError({ code: err.code, message: err.message });
    return true;
  }, []);

  const load = useCallback(
    async (requested?: string) => {
      const id = ++requestId.current;
      try {
        const query = requested ? `?date=${encodeURIComponent(requested)}` : '';
        const res = await api<AdminScheduleResponse>(`/api/admin/schedule${query}`, { locale });
        if (id !== requestId.current) return;
        setData(res);
        setDate(res.date);
        setLoadError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        if (!denyIfNeeded(err)) setLoadError(toShown(err));
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [locale, denyIfNeeded, toShown],
  );

  // ไม่ส่งวัน: API ใช้วันนี้ของเว็บและบอกวันกลับมา จึงไม่ต้องใช้ new Date
  useEffect(() => {
    void load();
  }, [load]);

  function onDateChange(value: string) {
    setDate(value);
    setActionError(null);
    if (!value) return;
    setLoading(true);
    void load(value);
  }

  async function complete(booking: AdminBooking) {
    setBusy(booking.bookingCode);
    setActionError(null);
    try {
      const res = await api<CompleteBookingResponse>(`/api/admin/bookings/${booking.id}/complete`, { locale, method: 'POST' });
      setData((prev) => prev && { ...prev, bookings: prev.bookings.map((b) => (b.id === booking.id ? { ...b, ...res.booking } : b)) });
      setResults((prev) => ({ ...prev, [booking.bookingCode]: res }));
    } catch (err) {
      if (denyIfNeeded(err)) return;
      setActionError({ ...toShown(err), bookingCode: booking.bookingCode });
      // เปิดสองแท็บแล้วกดซ้ำ: อ่านใหม่เพื่อให้ปุ่มหายและแต้มตรงกับจริง
      if (err instanceof ApiClientError && err.code === 'already-completed' && data) void load(data.date);
    } finally {
      setBusy(null);
    }
  }

  if (access !== 'ok') {
    const denied = accessError ?? { code: access === 'login' ? 'unauthorized' : 'forbidden', message: m.genericError };
    return (
      <div data-testid="admin-page">
        <Hero locale={locale} />
        <div className={`container ${styles.denied}`}>
          {access === 'login' ? (
            <Card gold className={styles.deniedCard}>
              <ErrorMessage code={denied.code} message={denied.message} />
              <p>{m.loginRequiredBody}</p>
              <LinkButton testId="admin-login-required" href={`/${locale}/login?next=/${locale}/admin`}>
                {common[locale].login}
              </LinkButton>
            </Card>
          ) : (
            <Card gold className={styles.deniedCard} testId="admin-forbidden">
              <ErrorMessage code={denied.code} message={denied.message} />
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="admin-page">
      <Hero locale={locale}>
        {data && (
          <div className={styles.datePanel}>
            <div className="field">
              <label htmlFor="admin-date">{m.dateLabel}</label>
              <input
                id="admin-date"
                type="date"
                className="input"
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                data-testid="admin-date"
              />
            </div>
            <p className={styles.dateSummary}>
              <span data-testid="admin-date-label">{formatDate(data.date, locale)}</span>
              <span aria-hidden="true"> · </span>
              <span data-testid="admin-count">{format(m.bookingCount, { n: data.bookings.length })}</span>
            </p>
          </div>
        )}
      </Hero>

      {loadError && (
        <div className={`container ${styles.status}`}>
          <ErrorMessage code={loadError.code} message={loadError.message} />
        </div>
      )}
      {loading && !data && !loadError && (
        <p role="status" className={`container ${styles.status}`} data-testid="admin-loading">
          {common[locale].loading}
        </p>
      )}

      {data && (
        <div aria-busy={loading}>
          <Section testId="admin-therapists" tone="cream" title={m.therapistsTitle} className={styles.compactSection}>
            <ul className={styles.therapists}>
              {data.therapists.map((t) => {
                const name = pick(t.name, locale);
                const queue = data.bookings.filter((b) => b.therapists.some((x) => x.id === t.id));
                return (
                  <li key={t.id} className={styles.therapist} data-testid={`admin-therapist-${t.id}`}>
                    <SmartImage src={t.photoPath} alt={name} ratio="1 / 1" sizes="56px" wrapperClassName={styles.therapistPhoto} />
                    <div className={styles.therapistText}>
                      <p className={styles.therapistName}>{name}</p>
                      <p className={styles.therapistQueue} data-testid={`admin-therapist-queue-${t.id}`}>
                        {queue.length === 0 ? m.noQueue : format(m.queueCount, { n: queue.length })}
                      </p>
                      {queue.length > 0 && <p className={styles.therapistTimes}>{queue.map((b) => b.time).join(' · ')}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section testId="admin-schedule" title={m.queueTitle} className={styles.compactSection}>
            {data.bookings.length === 0 ? (
              <Card gold testId="admin-empty" className={styles.empty}>
                <SmartImage
                  src="/brand/misc/empty-state.jpg"
                  alt={m.emptyAlt}
                  ratio="3 / 2"
                  sizes="(max-width: 720px) 100vw, 320px"
                  wrapperClassName={styles.emptyImage}
                />
                <div className={styles.emptyBody}>
                  <h3>{m.emptyDayTitle}</h3>
                  <p>{m.emptyDayBody}</p>
                </div>
              </Card>
            ) : (
              <table className={styles.table} role="table">
                <thead role="rowgroup">
                  <tr role="row">
                    <th role="columnheader" scope="col">{m.colTime}</th>
                    <th role="columnheader" scope="col">{m.colService}</th>
                    <th role="columnheader" scope="col">{m.colParty}</th>
                    <th role="columnheader" scope="col">{m.colCustomer}</th>
                    <th role="columnheader" scope="col">{m.colPhone}</th>
                    <th role="columnheader" scope="col">{m.colTherapist}</th>
                    <th role="columnheader" scope="col">{m.colPay}</th>
                    <th role="columnheader" scope="col">{m.colStatus}</th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {data.bookings.map((booking) => (
                    <BookingRow
                      key={booking.id}
                      booking={booking}
                      locale={locale}
                      busy={busy !== null}
                      result={results[booking.bookingCode]}
                      error={actionError?.bookingCode === booking.bookingCode ? actionError : null}
                      onComplete={complete}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function Hero({ locale, children }: { locale: Locale; children?: ReactNode }) {
  const m = f6[locale];
  return (
    <header className={styles.hero}>
      <ThaiPattern tone="light" />
      <div className={`container ${styles.heroInner}`}>
        <div className={styles.heroText}>
          <p className="eyebrow">{common[locale].admin}</p>
          <h1>{m.adminTitle}</h1>
          <p className={styles.heroIntro}>{m.adminIntro}</p>
        </div>
        {children}
      </div>
    </header>
  );
}

function BookingRow({
  booking,
  locale,
  busy,
  result,
  error,
  onComplete,
}: {
  booking: AdminBooking;
  locale: Locale;
  busy: boolean;
  result?: CompleteBookingResponse;
  error: ShownError | null;
  onComplete: (booking: AdminBooking) => void;
}) {
  const m = f6[locale];
  const code = booking.bookingCode;
  const completed = booking.status === 'COMPLETED';
  // ชื่อลูกค้าเป็นข้อความที่กรอกเองและไม่มีคำแปล · โหมด 中文 ห้ามมีอักษรไทย (NFR-07)
  const hidden = booking.isGuest ? m.customerHiddenGuest : m.customerHiddenMember;
  const customer = locale === 'zh' && THAI_CHARS.test(booking.customerName) ? hidden : booking.customerName;

  return (
    <tr role="row" className={completed ? `${styles.row} ${styles.rowDone}` : styles.row} data-testid={`admin-booking-${code}`} data-status={booking.status}>
      <td role="cell" data-label={m.colTime}>
        <span className={styles.time} data-testid={`admin-time-${code}`}>
          {booking.time}–{booking.endTime}
        </span>
        <span className={styles.code}>{code}</span>
      </td>
      <td role="cell" data-label={m.colService}>
        <span data-testid={`admin-service-${code}`}>{pick(booking.serviceName, locale)}</span>
        <span className={styles.tags}>
          {booking.coursePurchaseId && <span className={styles.tag}>{m.tagCourse}</span>}
          {booking.isCoupleSuite && <span className={styles.tag}>{m.tagCouple}</span>}
        </span>
      </td>
      <td role="cell" data-label={m.colParty}>
        <span data-testid={`admin-party-${code}`}>{format(m.partyCount, { n: booking.partySize })}</span>
      </td>
      <td role="cell" data-label={m.colCustomer}>
        <span data-testid={`admin-customer-${code}`}>{customer}</span>
        <span className={styles.tags}>
          <span className={styles.tag}>{booking.isGuest ? m.tagGuest : m.tagMember}</span>
        </span>
      </td>
      <td role="cell" data-label={m.colPhone}>
        <span data-testid={`admin-phone-${code}`}>{booking.customerPhone}</span>
      </td>
      <td role="cell" data-label={m.colTherapist}>
        <span data-testid={`admin-therapists-${code}`}>{booking.therapists.map((t) => pick(t.name, locale)).join(', ')}</span>
      </td>
      <td role="cell" data-label={m.colPay}>
        <span className={styles.pay} data-testid={`admin-pay-${code}`}>
          {formatBaht(booking.lines.payAtShop, locale)}
        </span>
      </td>
      <td role="cell" data-label={m.colStatus} className={styles.actionCell}>
        <span className={completed ? styles.statusDone : styles.statusOpen} data-testid={`admin-status-${code}`}>
          {completed ? m.statusCompleted : m.statusConfirmed}
        </span>
        {!completed && (
          <Button testId={`admin-complete-${code}`} size="sm" disabled={busy} onClick={() => onComplete(booking)} className={styles.completeBtn}>
            {m.completeButton}
          </Button>
        )}
        {completed && (
          <div className={styles.result} data-testid={`admin-result-${code}`}>
            <p data-testid={`admin-points-${code}`}>{format(m.pointsEarned, { n: result ? result.pointsEarned : booking.pointsEarned })}</p>
            {result?.member && (
              <p data-testid={`admin-member-${code}`}>
                {format(m.memberResult, {
                  points: result.member.pointsBalance,
                  spend: formatBaht(result.member.lifetimeSpend, locale),
                  tier: result.member.tier,
                })}
              </p>
            )}
            {result && !result.member && <p data-testid={`admin-guest-${code}`}>{m.guestResult}</p>}
            {result?.course && (
              <p data-testid={`admin-course-${code}`}>
                {format(m.courseResult, { remaining: result.course.remaining, used: result.course.usedSessions })}
              </p>
            )}
          </div>
        )}
        {error && <ErrorMessage code={error.code} message={error.message} />}
      </td>
    </tr>
  );
}
