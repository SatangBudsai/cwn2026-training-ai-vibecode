import { LinkButton, SmartImage } from '@/components/ui';
import { f4 } from '@/i18n/f4';
import { format, pick } from '@/i18n/locales';
import { formatDate } from '@/lib/format';
import type { BookingDetail, Locale, Tier } from '@/types';
import { PriceSummary } from './PriceSummary';
import styles from './booking.module.css';

export interface ConfirmationProps {
  locale: Locale;
  booking: BookingDetail;
  tier?: Tier | null;
}

/** ยอดอ่านจาก booking.lines ที่ API ตอบกลับ จึงตรงกับหลังร้าน (NFR-11) */
export function Confirmation({ locale, booking, tier }: ConfirmationProps) {
  const m = f4[locale];
  const isGuest = booking.userId === null;
  return (
    <section data-testid="booking-confirmation" className={styles.screen}>
      <div className={styles.doneLayout}>
        <div className={styles.doneMain}>
          <p className="eyebrow">{m.doneEyebrow}</p>
          <h2 className={styles.screenTitle}>{m.doneTitle}</h2>

          <div className={styles.codeBox}>
            <span className={styles.codeLabel}>{m.codeLabel}</span>
            <strong className={styles.codeValue} data-testid="booking-code">
              {booking.bookingCode}
            </strong>
            {isGuest && <small className={styles.codeHint}>{m.codeGuestHint}</small>}
          </div>

          <dl className={styles.doneFacts}>
            <div>
              <dt>{m.serviceLabel}</dt>
              <dd data-testid="booking-done-service">{pick(booking.serviceName, locale)}</dd>
            </div>
            <div>
              <dt>{m.whenLabel}</dt>
              <dd data-testid="booking-done-when">
                {formatDate(booking.date, locale)} · {booking.time}–{booking.endTime}
                {booking.isCoupleSuite ? ` · ${m.recapSuite}` : ''}
              </dd>
            </div>
            <div>
              <dt>
                {m.therapistsLabel} · {format(m.recapParty, { n: booking.partySize })}
              </dt>
              <dd className={styles.doneTherapists} data-testid="booking-done-therapists">
                {booking.therapists.map((t) => (
                  <span key={`${t.personNo}-${t.id}`} className={styles.doneTherapist} data-testid={`booking-assigned-${t.id}`}>
                    <span className={styles.doneTherapistPhoto}>
                      <SmartImage src={t.photoPath} alt={pick(t.name, locale)} ratio="1 / 1" sizes="44px" />
                    </span>
                    {pick(t.name, locale)}
                  </span>
                ))}
              </dd>
            </div>
            {booking.guestName && (
              <div>
                <dt>{m.bookerLabel}</dt>
                <dd data-testid="booking-done-guest">
                  {booking.guestName}
                  {booking.guestPhone ? ` · ${booking.guestPhone}` : ''}
                </dd>
              </div>
            )}
            {(booking.hotelName || booking.distanceKm) && (
              <div>
                <dt>{m.pickupLabel}</dt>
                <dd data-testid="booking-done-pickup">
                  {booking.hotelName ? pick(booking.hotelName, locale) : format(m.pickupDistance, { km: booking.distanceKm ?? '' })}
                </dd>
              </div>
            )}
          </dl>

          <div className={styles.doneActions}>
            {isGuest ? (
              <LinkButton
                testId="booking-link-cancel"
                variant="ghost"
                href={`/${locale}/booking/cancel?code=${encodeURIComponent(booking.bookingCode)}`}
              >
                {m.linkCancel}
              </LinkButton>
            ) : (
              <LinkButton testId="booking-link-account" href={`/${locale}/account`}>
                {m.linkAccount}
              </LinkButton>
            )}
          </div>
          {booking.canCancel ? (
            <p className={styles.note} data-testid="booking-no-reschedule">
              {m.noReschedule}
            </p>
          ) : (
            <p className={styles.warning} data-testid="booking-done-no-cancel">
              {m.doneNoCancel}
            </p>
          )}
        </div>

        <aside className={styles.doneAside}>
          <div className={styles.doneImage}>
            <SmartImage src="/brand/shop/welcome-tea.jpg" alt={m.doneImageAlt} ratio="16 / 9" sizes="(max-width: 900px) 100vw, 420px" style={{ objectPosition: '50% 0%' }} />
          </div>
          <div className={styles.receipt}>
            <h3 className={styles.blockTitle}>{m.linesTitle}</h3>
            <PriceSummary locale={locale} lines={booking.lines} partySize={booking.partySize} tier={tier} />
            <p className={styles.note} data-testid="booking-no-online-payment">
              {m.noOnlinePayment}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
