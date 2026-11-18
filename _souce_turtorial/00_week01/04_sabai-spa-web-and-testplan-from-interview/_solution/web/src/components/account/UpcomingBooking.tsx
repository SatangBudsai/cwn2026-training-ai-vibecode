'use client';
import { Button, Card } from '@/components/ui';
import { f5 } from '@/i18n/f5';
import { format, pick } from '@/i18n/locales';
import { formatBaht, formatDate } from '@/lib/format';
import type { BookingDetail, Locale } from '@/types';
import { TherapistList } from './TherapistList';
import styles from './account.module.css';

export interface UpcomingBookingProps {
  booking: BookingDetail;
  locale: Locale;
  confirming: boolean;
  busy: boolean;
  onAsk: () => void;
  onKeep: () => void;
  onConfirm: () => void;
}

export function UpcomingBooking({ booking, locale, confirming, busy, onAsk, onKeep, onConfirm }: UpcomingBookingProps) {
  const m = f5[locale];
  const code = booking.bookingCode;

  const party =
    booking.bookingType === 'SINGLE' ? m.partySingle : booking.bookingType === 'COUPLE' ? m.partyCouple : format(m.partyGroup, { n: booking.partySize });
  const shuttle = booking.hotelName
    ? format(m.shuttleHotel, { hotel: pick(booking.hotelName, locale) })
    : booking.distanceKm
      ? format(m.shuttleDistance, { km: booking.distanceKm })
      : null;

  return (
    <Card gold testId={`account-booking-${code}`} className={styles.booking}>
      <div className={styles.bookingWhen}>
        <p className={styles.bookingDate} data-testid={`account-booking-date-${code}`}>{formatDate(booking.date, locale)}</p>
        <p className={styles.bookingTime} data-testid={`account-booking-time-${code}`}>{booking.time}–{booking.endTime}</p>
      </div>
      <div className={styles.bookingBody}>
        <div>
          <h3 data-testid={`account-booking-service-${code}`}>{pick(booking.serviceName, locale)}</h3>
          <p className={styles.bookingCode} data-testid={`account-booking-code-${code}`}>{format(m.bookingCode, { code })}</p>
        </div>
        <p className={styles.bookingMeta} data-testid={`account-booking-party-${code}`}>
          {party}
          {booking.coursePurchaseId && <span className="badge badge-gold">{m.usedCourse}</span>}
        </p>
        {shuttle && <p className={styles.bookingMeta} data-testid={`account-booking-shuttle-${code}`}>{shuttle}</p>}
        <TherapistList therapists={booking.therapists} locale={locale} testIdPrefix={`account-therapist-${code}`} />
        <p className={styles.bookingTotal}>
          <span>{m.payAtShop}</span>
          <strong data-testid={`account-booking-total-${code}`}>{formatBaht(booking.lines.payAtShop, locale)}</strong>
        </p>

        {booking.bookingType !== 'SINGLE' && <p className={styles.bookingNote} data-testid={`account-whole-only-${code}`}>{m.wholeOnly}</p>}

        {booking.canCancel ? (
          confirming ? (
            <div className={styles.confirm} role="group" aria-labelledby={`account-confirm-title-${code}`} data-testid={`account-cancel-panel-${code}`}>
              <p id={`account-confirm-title-${code}`} className={styles.confirmTitle}>{format(m.cancelConfirmTitle, { code })}</p>
              <p>{m.cancelConfirmBody}</p>
              <div className={styles.actions}>
                <Button testId={`account-cancel-confirm-${code}`} variant="danger" size="sm" disabled={busy} onClick={onConfirm}>
                  {busy ? m.cancelBusy : m.cancelYes}
                </Button>
                <Button testId={`account-cancel-keep-${code}`} variant="ghost" size="sm" disabled={busy} onClick={onKeep} autoFocus>
                  {m.cancelKeep}
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.actions}>
              <Button testId={`account-cancel-${code}`} variant="danger" size="sm" onClick={onAsk}>
                {m.cancelButton}
              </Button>
            </div>
          )
        ) : (
          <div className={styles.callNote} data-testid={`account-call-${code}`}>
            <p>
              {m.under24}{' '}
              <a href={`tel:${m.shopPhone}`} data-testid={`account-call-link-${code}`}>{m.shopPhone}</a>
            </p>
            <p className={styles.callNoteSoft}>{m.under24NoFee}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
