'use client';
import Link from 'next/link';
import type { RefObject } from 'react';
import { Button, ErrorMessage, SmartImage } from '@/components/ui';
import { catalogError, type UiError } from './use-api-resource';
import { f4 } from '@/i18n/f4';
import { format, pick } from '@/i18n/locales';
import { formatBaht, formatDate } from '@/lib/format';
import type { CourseSummary, Locale, Service, ServiceId } from '@/types';
import styles from './booking.module.css';

const PARTY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export interface ScreenServiceProps {
  locale: Locale;
  services: Service[];
  loading: boolean;
  error: UiError | null;
  onRetry: () => void;
  selectedService: Service | null;
  party: number;
  courses: CourseSummary[];
  activeCourseId: string | null;
  /** ?course= ใช้ไม่ได้ เช่น ไม่ได้เข้าสู่ระบบ หรือไม่พบคอร์ส */
  courseNotice: UiError | null;
  loginHref: string;
  partyRef: RefObject<HTMLDivElement | null>;
  canNext: boolean;
  onSelectService: (id: ServiceId) => void;
  onSelectCourse: (id: string) => void;
  onSelectParty: (n: number) => void;
  onNext: () => void;
}

export function ScreenService(props: ScreenServiceProps) {
  const { locale, services, loading, error, onRetry, selectedService, party, courses, activeCourseId, courseNotice, loginHref, partyRef, canNext } = props;
  const m = f4[locale];
  const courseMode = activeCourseId !== null;
  const overMax = selectedService !== null && party < 7 && party > selectedService.maxParty;
  const kService = services.find((s) => s.id === 'K01');

  return (
    <section data-testid="booking-screen-1" className={styles.screen}>
      <h2 className={styles.screenTitle}>{m.s1Title}</h2>

      {error && (
        <div className={styles.stack}>
          <ErrorMessage code={error.code} message={error.message} />
          <div>
            <Button testId="booking-retry" variant="ghost" size="sm" onClick={onRetry}>
              {m.retry}
            </Button>
          </div>
        </div>
      )}

      {courseNotice && (
        <div className={styles.stack}>
          <ErrorMessage code={courseNotice.code} message={courseNotice.message} />
          {courseNotice.code === 'course-login-required' && (
            <Link href={loginHref} data-testid="booking-course-login" className={styles.inlineLink}>
              {m.courseLogin}
            </Link>
          )}
        </div>
      )}

      {courses.length > 0 && (
        <div className={styles.coursePanel} data-testid="booking-course-panel">
          <h3 className={styles.blockTitle}>{m.courseTitle}</h3>
          {courses.map((c, i) => (
            <CourseRow
              key={c.id}
              locale={locale}
              course={c}
              service={kService}
              primary={i === 0}
              active={c.id === activeCourseId}
              onSelect={() => props.onSelectCourse(c.id)}
            />
          ))}
          {courseMode && (
            <p className={styles.note} data-testid="booking-course-lock">
              {m.courseLock}
            </p>
          )}
        </div>
      )}

      <div className={styles.serviceGrid} aria-busy={loading || undefined}>
        {loading && services.length === 0
          ? Array.from({ length: 8 }, (_, i) => <div key={i} className={styles.serviceSkeleton} aria-hidden="true" />)
          : services
              .filter((s) => s.id !== 'K01')
              .map((s) => {
                const selected = !courseMode && selectedService?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    data-testid={`booking-service-${s.id}`}
                    aria-pressed={selected}
                    className={selected ? `${styles.serviceCard} ${styles.serviceCardOn}` : styles.serviceCard}
                    onClick={() => props.onSelectService(s.id)}
                  >
                    <span className={styles.serviceImage}>
                      <SmartImage
                        src={s.imagePath}
                        alt={pick(s.name, locale)}
                        ratio="4 / 3"
                        wrapperClassName={styles.serviceImageBox}
                        sizes="(max-width: 700px) 112px, (max-width: 900px) 45vw, 280px"
                      />
                    </span>
                    <span className={styles.serviceBody}>
                      <span className={styles.serviceName}>{pick(s.name, locale)}</span>
                      <span className={styles.serviceMeta}>{format(m.minutes, { n: s.durationMinutes })}</span>
                      <span className={styles.servicePrice}>
                        {formatBaht(s.price, locale)} <small>{m.perPerson}</small>
                      </span>
                      {s.kind === 'PACKAGE' && <span className={`badge badge-gold ${styles.serviceBadge}`}>{m.packageBadge}</span>}
                    </span>
                  </button>
                );
              })}
      </div>

      <div className={styles.partyBlock} ref={partyRef}>
        <h3 className={styles.blockTitle}>{m.partyTitle}</h3>
        <div className={styles.partyGrid} role="group" aria-label={m.partyTitle}>
          {PARTY_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              data-testid={`booking-party-${n}`}
              aria-pressed={party === n}
              aria-label={n === 7 ? m.partyAriaMax : format(m.partyAria, { n })}
              disabled={courseMode && n !== 1}
              className={party === n ? `${styles.partyBtn} ${styles.partyBtnOn}` : styles.partyBtn}
              onClick={() => props.onSelectParty(n)}
            >
              {n === 7 ? '7+' : n}
            </button>
          ))}
        </div>

        {party >= 7 ? (
          <div className={styles.callBox} data-testid="booking-call-shop">
            <p>{m.partyCall}</p>
            <a href="tel:021234567" data-testid="booking-call-shop-link" className={styles.callLink}>
              {m.callNow}
            </a>
          </div>
        ) : (
          <p className={styles.note} data-testid="booking-party-note">
            {party === 1 ? m.partySingle : party === 2 ? m.partyCouple : m.partyGroup}
          </p>
        )}

        {overMax && selectedService && (
          <div className={styles.stack}>
            <ErrorMessage {...catalogError('not-enough-therapists', locale)} />
            <p className={styles.note} data-testid="booking-party-max">
              {format(m.partyMax, { n: selectedService.maxParty })}
            </p>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {!selectedService && party < 7 && (
          <p className={styles.hint} data-testid="booking-step1-hint">
            {m.pickServiceHint}
          </p>
        )}
        <Button testId="booking-step1-next" size="lg" className={styles.actionMain} disabled={!canNext} onClick={props.onNext}>
          {m.next}
        </Button>
      </div>
    </section>
  );
}

function CourseRow({ locale, course, service, primary, active, onSelect }: {
  locale: Locale;
  course: CourseSummary;
  service: Service | undefined;
  primary: boolean;
  active: boolean;
  onSelect: () => void;
}) {
  const m = f4[locale];
  const usedUp = course.remaining <= 0;
  const blocked = usedUp || course.expired;
  const suffix = primary ? '' : `-${course.id}`;
  return (
    <div className={active ? `${styles.courseRow} ${styles.courseRowOn}` : styles.courseRow}>
      {service && (
        <div className={styles.courseImage}>
          <SmartImage src={service.imagePath} alt="" ratio="1 / 1" sizes="72px" />
        </div>
      )}
      <div className={styles.courseBody}>
        <p className={styles.serviceName}>{pick(course.serviceName, locale)}</p>
        <p className={styles.serviceMeta} data-testid={`booking-course-remaining${suffix}`}>
          {format(m.courseRemaining, { n: course.remaining, total: course.totalSessions })}
        </p>
        <p className={styles.serviceMeta}>{format(m.courseUntil, { date: formatDate(course.expiresOn, locale) })}</p>
      </div>
      <div className={styles.courseAction}>
        <Button
          testId={`booking-use-course${suffix}`}
          variant={active ? 'primary' : 'ghost'}
          size="sm"
          aria-pressed={active}
          disabled={blocked}
          onClick={onSelect}
        >
          {active ? m.courseInUse : m.courseUse}
        </Button>
      </div>
      {blocked && (
        <div className={styles.courseStatus}>
          {primary ? (
            // ตรวจ used-up ก่อน expired ตามสัญญา 2.3
            <ErrorMessage {...catalogError(usedUp ? 'course-used-up' : 'course-expired', locale)} />
          ) : (
            <p className={styles.note} data-testid={`booking-course-status-${course.id}`}>
              {usedUp ? m.courseUsedUp : m.courseExpired}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
