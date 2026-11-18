'use client';
import { Button, ErrorMessage, SmartImage } from '@/components/ui';
import { f4 } from '@/i18n/f4';
import { format, pick } from '@/i18n/locales';
import { formatDate } from '@/lib/format';
import type { AvailabilityResponse, ClockResponse, Locale, Service, Therapist, TherapistId } from '@/types';
import { Recap } from './Recap';
import type { UiError } from './use-api-resource';
import styles from './booking.module.css';

const QUICK_DAYS = 7;
const INTL_TAG: Record<Locale, string> = { th: 'th-TH-u-ca-gregory-nu-latn', en: 'en-GB', zh: 'zh-CN' };

/** บวกวันจากสตริงวันที่ของ API · ไม่อ่านเวลาเครื่อง */
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function quickDates(clock: ClockResponse): string[] {
  const out: string[] = [];
  for (let i = 0; i < QUICK_DAYS; i++) {
    const d = addDays(clock.minBookingDate, i);
    if (d > clock.maxBookingDate) break;
    out.push(d);
  }
  return out;
}

function slotPeriod(time: string): 'morning' | 'afternoon' | 'evening' {
  if (time < '12:00') return 'morning';
  return time < '17:00' ? 'afternoon' : 'evening';
}

export interface ScreenScheduleProps {
  locale: Locale;
  service: Service;
  party: number;
  courseMode: boolean;
  clock: ClockResponse | null;
  clockError: UiError | null;
  date: string;
  time: string;
  therapist: TherapistId | 'ANY';
  therapists: Therapist[];
  availability: AvailabilityResponse | null;
  availabilityError: UiError | null;
  availabilityLoading: boolean;
  /** ข้อความ เวลานี้ถูกจองแล้ว ที่พากลับมาจากหน้าจอ 3 */
  takenError: UiError | null;
  canNext: boolean;
  onDate: (date: string) => void;
  onTime: (time: string) => void;
  onTherapist: (id: TherapistId | 'ANY') => void;
  onBack: () => void;
  onNext: () => void;
}

export function ScreenSchedule(props: ScreenScheduleProps) {
  const { locale, service, party, courseMode, clock, clockError, date, time, therapist, therapists, availability, availabilityError, availabilityLoading, takenError, canNext } = props;
  const m = f4[locale];
  const slots = availabilityError ? [] : (availability?.slots ?? []);
  const timeListed = slots.some((s) => s.time === time);
  const weekday = new Intl.DateTimeFormat(INTL_TAG[locale], { weekday: 'short', timeZone: 'UTC' });
  const showSlots = date !== '' && !availabilityError;
  const periods = (['morning', 'afternoon', 'evening'] as const)
    .map((p) => ({ p, items: slots.filter((s) => slotPeriod(s.time) === p) }))
    .filter((g) => g.items.length > 0);
  const periodLabel = { morning: m.periodMorning, afternoon: m.periodAfternoon, evening: m.periodEvening };

  return (
    <section data-testid="booking-screen-2" className={styles.screen}>
      <h2 className={styles.screenTitle}>{m.s2Title}</h2>
      <Recap locale={locale} service={service} party={party} courseMode={courseMode} />

      {takenError && <ErrorMessage code={takenError.code} message={takenError.message} />}
      {clockError && <ErrorMessage code={clockError.code} message={clockError.message} />}

      <div className={styles.block}>
        <div className="field">
          <label htmlFor="booking-date" className={styles.blockTitle}>
            {m.dateLabel}
          </label>
          <input
            id="booking-date"
            type="date"
            className={`input ${styles.dateInput}`}
            data-testid="booking-date"
            min={clock?.minBookingDate}
            max={clock?.maxBookingDate}
            value={date}
            onChange={(e) => props.onDate(e.target.value)}
          />
          {clock && (
            <p className={styles.note} data-testid="booking-date-range">
              {format(m.dateRange, { min: formatDate(clock.minBookingDate, locale), max: formatDate(clock.maxBookingDate, locale) })}
            </p>
          )}
        </div>
        {clock && (
          <div className={styles.dateChips} role="group" aria-label={m.dateQuick}>
            {quickDates(clock).map((d) => {
              const [y, mo, day] = d.split('-').map(Number);
              return (
                <button
                  key={d}
                  type="button"
                  data-testid={`booking-date-chip-${d}`}
                  aria-pressed={date === d}
                  aria-label={formatDate(d, locale)}
                  className={date === d ? `${styles.dateChip} ${styles.dateChipOn}` : styles.dateChip}
                  onClick={() => props.onDate(d)}
                >
                  <small>{weekday.format(new Date(Date.UTC(y, mo - 1, day)))}</small>
                  <span>{day}</span>
                </button>
              );
            })}
          </div>
        )}
        {availabilityError && <ErrorMessage code={availabilityError.code} message={availabilityError.message} />}
        {availabilityError?.code === 'same-day-call' && (
          <a href="tel:021234567" data-testid="booking-same-day-call-link" className={styles.callLink}>
            {m.callNow}
          </a>
        )}
      </div>

      <div className={styles.block}>
        {party === 1 ? (
          <>
            <h3 className={styles.blockTitle}>{m.therapistTitle}</h3>
            <div className={styles.therapistGrid} role="group" aria-label={m.therapistTitle}>
              <button
                type="button"
                data-testid="booking-therapist-any"
                aria-pressed={therapist === 'ANY'}
                className={therapist === 'ANY' ? `${styles.therapistCard} ${styles.therapistCardOn}` : styles.therapistCard}
                onClick={() => props.onTherapist('ANY')}
              >
                <span className={styles.anyMark} aria-hidden="true">
                  ✦
                </span>
                <span className={styles.therapistText}>
                  <span className={styles.therapistName}>{m.therapistAny}</span>
                  <small className={styles.therapistRating}>{m.therapistAnyHint}</small>
                </span>
              </button>
              {therapists.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  data-testid={`booking-therapist-${t.id}`}
                  aria-pressed={therapist === t.id}
                  className={therapist === t.id ? `${styles.therapistCard} ${styles.therapistCardOn}` : styles.therapistCard}
                  onClick={() => props.onTherapist(t.id)}
                >
                  <span className={styles.therapistPhoto}>
                    <SmartImage src={t.photoPath} alt={pick(t.name, locale)} ratio="1 / 1" sizes="44px" />
                  </span>
                  <span className={styles.therapistText}>
                    <span className={styles.therapistName}>{pick(t.name, locale)}</span>
                    <small className={styles.therapistRating} data-testid={`booking-therapist-rating-${t.id}`}>
                      {t.ratingText === null ? m.noReviews : `★ ${t.ratingText} · ${format(m.reviewCount, { n: t.reviewCount })}`}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className={styles.autoNote} data-testid="booking-auto-assign-note">
            {party === 2 ? m.autoCouple : format(m.autoGroup, { n: party })}
          </p>
        )}
      </div>

      <div className={styles.block}>
        <h3 className={styles.blockTitle}>{m.slotsTitle}</h3>
        {date === '' && (
          <p className={styles.note} data-testid="booking-slots-pick-date">
            {m.slotsPickDate}
          </p>
        )}
        {showSlots && availabilityLoading && !availability && <div className={styles.slotSkeleton} aria-hidden="true" />}
        {showSlots && availability && slots.length === 0 && !availabilityLoading && (
          <p className={styles.note} data-testid="booking-slots-empty">
            {m.slotsEmpty}
          </p>
        )}
        {showSlots && time !== '' && availability && !availabilityLoading && !timeListed && slots.length > 0 && (
          <p className={styles.note} data-testid="booking-slot-gone">
            {format(m.slotGone, { time })}
          </p>
        )}
        {showSlots && (
          <div className={availabilityLoading ? `${styles.slotGroups} ${styles.dimmed}` : styles.slotGroups} aria-busy={availabilityLoading || undefined}>
            {periods.map(({ p, items }) => (
              <div key={p} className={styles.slotGroup}>
                <p className={styles.slotPeriod}>{periodLabel[p]}</p>
                <div className={styles.slotGrid}>
                  {items.map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      data-testid={`booking-slot-${s.time.replace(':', '-')}`}
                      aria-pressed={time === s.time}
                      className={time === s.time ? `${styles.slotBtn} ${styles.slotBtnOn}` : styles.slotBtn}
                      onClick={() => props.onTime(s.time)}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {!canNext && !availabilityLoading && (
          <p className={styles.hint} data-testid="booking-step2-hint">
            {m.pickSlotHint}
          </p>
        )}
        <div className={styles.actionRow}>
          <Button testId="booking-step2-back" variant="ghost" onClick={props.onBack}>
            {m.back}
          </Button>
          <Button testId="booking-step2-next" size="lg" className={styles.actionMain} disabled={!canNext} onClick={props.onNext}>
            {m.next}
          </Button>
        </div>
      </div>
    </section>
  );
}
