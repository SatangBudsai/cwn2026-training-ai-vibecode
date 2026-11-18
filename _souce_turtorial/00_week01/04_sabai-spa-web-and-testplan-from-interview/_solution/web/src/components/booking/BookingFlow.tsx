'use client';
import { useEffect, useRef, useState } from 'react';
import { f4 } from '@/i18n/f4';
import { format, pick } from '@/i18n/locales';
import { api } from '@/lib/api-client';
import type {
  AvailabilityResponse,
  BookingDetail,
  ClockResponse,
  CourseSummary,
  CreateBookingRequest,
  CreateBookingResponse,
  HotelsResponse,
  Locale,
  QuoteRequest,
  QuoteResponse,
  Role,
  ServiceId,
  ServicesResponse,
  ShuttleInput,
  TherapistId,
  TherapistsResponse,
  Tier,
  WalletResponse,
} from '@/types';
import { Confirmation } from './Confirmation';
import type { BookingDeepLink } from './deep-link';
import { ScreenSchedule } from './ScreenSchedule';
import { ScreenService } from './ScreenService';
import { ScreenSummary } from './ScreenSummary';
import { catalogError, toUiError, useApiResource, type UiError } from './use-api-resource';
import styles from './booking.module.css';

type Screen = 1 | 2 | 3;

export interface BookingFlowProps {
  locale: Locale;
  initial: BookingDeepLink;
  /** จาก session ฝั่งเซิร์ฟเวอร์ · OWNER นับเป็นแขกตามสัญญา 2.2 */
  role: Role | null;
}

const usable = (c: CourseSummary) => c.remaining > 0 && !c.expired;

export function BookingFlow({ locale, initial, role }: BookingFlowProps) {
  const m = f4[locale];
  const [screen, setScreen] = useState<Screen>(1);
  const [servicesNonce, setServicesNonce] = useState(0);

  // หน้าจอ 1
  const [serviceId, setServiceId] = useState<ServiceId | null>(initial.service === 'K01' ? null : initial.service);
  const [partyChoice, setPartyChoice] = useState(initial.party);
  /** undefined = ยังไม่ได้ตัดสินใจเอง ใช้ค่าจาก deep link */
  const [courseChoice, setCourseChoice] = useState<string | null | undefined>(undefined);

  // หน้าจอ 2
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [therapistChoice, setTherapistChoice] = useState<TherapistId | 'ANY'>(initial.therapist);
  const [availabilityNonce, setAvailabilityNonce] = useState(0);

  // หน้าจอ 3
  const [pointsSets, setPointsSets] = useState(0);
  const [useBirthday, setUseBirthday] = useState(false);
  const [shuttle, setShuttle] = useState<ShuttleInput | null>(null);
  const [giftDraft, setGiftDraft] = useState('');
  const [giftCode, setGiftCode] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [quoteNonce, setQuoteNonce] = useState(0);
  const [confirmError, setConfirmError] = useState<UiError | null>(null);
  const [slotTaken, setSlotTaken] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [bookedTier, setBookedTier] = useState<Tier | null>(null);

  const servicesRes = useApiResource<ServicesResponse>({ locale, path: '/api/services', scope: 'services', nonce: servicesNonce });
  const services = servicesRes.data?.services ?? [];

  // แขกไม่เรียก wallet · ถ้าเรียกแล้วได้ 401 (session หมดอายุ) ก็ถือเป็นแขก
  const walletRes = useApiResource<WalletResponse>({ locale, path: role === 'CUSTOMER' ? '/api/wallet' : null, scope: 'wallet' });
  const isMember = role === 'CUSTOMER' && walletRes.error?.code !== 'unauthorized';
  const allCourses = isMember ? (walletRes.data?.courses ?? []).filter((c) => c.serviceId === 'K01') : [];

  const wantsCourse = initial.course !== null || initial.service === 'K01';
  const walletPending = wantsCourse && role === 'CUSTOMER' && walletRes.loading;
  const activeCourse =
    courseChoice === undefined
      ? initial.course
        ? allCourses.find((c) => c.id === initial.course && usable(c))
        : initial.service === 'K01'
          ? allCourses.find(usable)
          : undefined
      : allCourses.find((c) => c.id === courseChoice && usable(c));
  const courseId = activeCourse?.id ?? null;
  const courses = [...allCourses].sort((a, b) => courseRank(a, initial.course) - courseRank(b, initial.course));

  let courseNotice: UiError | null = null;
  if (courseChoice === undefined && wantsCourse && !walletPending) {
    if (!isMember) courseNotice = catalogError('course-login-required', locale);
    else if (initial.course && !allCourses.some((c) => c.id === initial.course)) courseNotice = catalogError('course-not-found', locale);
  }

  const effectiveServiceId: ServiceId | null = courseId ? 'K01' : serviceId;
  const service = services.find((s) => s.id === effectiveServiceId) ?? null;
  const party = courseId ? 1 : partyChoice;
  // คู่และกลุ่มระบบจัดให้ · คนที่ทำบริการไม่ได้ (เช่น deep link ผิดคู่) ถือเป็นใครก็ได้
  const therapist: TherapistId | 'ANY' =
    party === 1 && therapistChoice !== 'ANY' && (!service || service.therapistIds.includes(therapistChoice)) ? therapistChoice : 'ANY';

  const therapistsRes = useApiResource<TherapistsResponse>({
    locale,
    path: screen !== 1 && party === 1 && effectiveServiceId ? `/api/therapists?service=${effectiveServiceId}` : null,
    scope: `therapists|${effectiveServiceId}`,
  });
  const therapists = therapistsRes.data?.therapists ?? [];

  const clockRes = useApiResource<ClockResponse>({ locale, path: screen === 2 ? '/api/clock' : null, scope: 'clock', nonce: availabilityNonce });

  const availabilityQuery = new URLSearchParams({ service: effectiveServiceId ?? '', date, party: String(party) });
  if (therapist !== 'ANY') availabilityQuery.set('therapist', therapist);
  if (courseId) availabilityQuery.set('course', courseId);
  const availabilityRes = useApiResource<AvailabilityResponse>({
    locale,
    path: screen !== 1 && !booking && effectiveServiceId && date ? `/api/availability?${availabilityQuery}` : null,
    scope: `availability|${effectiveServiceId}|${date}|${party}|${courseId}`,
    nonce: availabilityNonce,
  });
  const timeListed = !availabilityRes.error && (availabilityRes.data?.slots ?? []).some((s) => s.time === time);

  const quoteBody: QuoteRequest | null =
    effectiveServiceId && date && time
      ? {
          serviceId: effectiveServiceId,
          partySize: party,
          date,
          time,
          pointsToRedeem: pointsSets > 0 ? pointsSets * 100 : undefined,
          useBirthday: useBirthday || undefined,
          shuttle: shuttle ?? undefined,
          giftCardCode: giftCode || undefined,
          coursePurchaseId: courseId ?? undefined,
        }
      : null;
  const quoteRes = useApiResource<QuoteResponse>({
    locale,
    path: screen === 3 && !booking && quoteBody ? '/api/quote' : null,
    body: quoteBody,
    scope: `quote|${effectiveServiceId}|${party}|${date}|${time}|${courseId}`,
    nonce: quoteNonce,
    debounceMs: 250,
  });
  const quote = quoteRes.data;

  const hotelsRes = useApiResource<HotelsResponse>({ locale, path: screen === 3 ? '/api/hotels' : null, scope: 'hotels' });

  // เปลี่ยนหน้าจอแล้วเริ่มอ่านจากด้านบน และย้าย focus ให้ screen reader ตามทัน
  const topRef = useRef<HTMLDivElement>(null);
  const partyRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const isDone = booking !== null;
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    topRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
    topRef.current?.focus({ preventScroll: true });
  }, [screen, isDone]);

  const resetExtras = () => {
    setPointsSets(0);
    setUseBirthday(false);
    setShuttle(null);
  };

  const selectService = (id: ServiceId) => {
    if (id !== effectiveServiceId) resetExtras();
    setServiceId(id);
    setCourseChoice(null);
    // มือถือ: รายการบริการยาว เลื่อนให้เห็นจำนวนคนต่อทันที
    if (window.matchMedia('(max-width: 700px)').matches) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      partyRef.current?.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth', block: 'center' });
    }
  };

  const selectCourse = (id: string) => {
    if (id === courseId) {
      setCourseChoice(null);
    } else {
      setCourseChoice(id);
      setTherapistChoice('ANY');
    }
    resetExtras();
  };

  const goToScreen = (s: Screen) => {
    setScreen(s);
    if (s === 2) setAvailabilityNonce((n) => n + 1);
    if (s === 3) setQuoteNonce((n) => n + 1);
  };

  const leaveScheduleForward = () => {
    setSlotTaken(false);
    setConfirmError(null);
    goToScreen(3);
  };

  const pickTime = (t: string) => {
    setTime(t);
    setSlotTaken(false);
    setConfirmError(null);
  };

  const clearGuestError = () => {
    if (confirmError?.code === 'guest-info-required' || confirmError?.code === 'phone-invalid') setConfirmError(null);
  };

  const confirm = async () => {
    if (!quote || !quoteBody) return;
    setSubmitting(true);
    setConfirmError(null);
    const body: CreateBookingRequest = {
      ...quoteBody,
      time,
      therapistId: party === 1 ? therapist : undefined,
      guest: isMember ? undefined : { name: guestName.trim(), phone: guestPhone.trim() },
      expectedPayAtShop: quote.lines.payAtShop,
    };
    try {
      const res = await api<CreateBookingResponse>('/api/bookings', { locale, body });
      setBookedTier(quote.tier);
      setBooking(res.booking);
    } catch (e) {
      const err = toUiError(e, locale);
      setConfirmError(err);
      if (err.code === 'slot-taken' || err.code === 'not-enough-therapists') {
        setSlotTaken(true);
        setAvailabilityNonce((n) => n + 1);
      } else if (err.code !== 'guest-info-required' && err.code !== 'phone-invalid') {
        // price-changed และ error ราคาอื่น ๆ: โหลดสรุปใหม่ให้ลูกค้าเห็นยอดล่าสุด
        setQuoteNonce((n) => n + 1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [m.stepService, m.stepSchedule, m.stepConfirm];
  const loginQuery = new URLSearchParams({ party: String(party) });
  if (serviceId) loginQuery.set('service', serviceId);
  if (party === 1 && therapist !== 'ANY') loginQuery.set('therapist', therapist);
  const loginHref = `/${locale}/login?next=${encodeURIComponent(`/${locale}/booking?${loginQuery}`)}`;

  const overMax = service !== null && party < 7 && party > service.maxParty;
  const canLeaveService = service !== null && party < 7 && !overMax && !walletPending;
  const canLeaveSchedule = date !== '' && time !== '' && timeListed && !availabilityRes.loading;

  const therapistLabel =
    party !== 1
      ? m.recapAuto
      : therapist === 'ANY'
        ? m.recapAny
        : format(m.recapTherapist, { name: therapistName(therapists, therapist, locale) });

  return (
    <div className={`container ${styles.flow}`} ref={topRef} tabIndex={-1} data-testid="booking-flow" data-screen={isDone ? 'done' : screen}>
      {!isDone && (
        <ol className={styles.progress} aria-label={m.progressLabel} data-testid="booking-progress" data-step={screen}>
          {steps.map((label, i) => {
            const n = i + 1;
            const cls = [styles.progressStep, n === screen && styles.progressNow, n < screen && styles.progressPast].filter(Boolean).join(' ');
            return (
              <li key={label} className={cls} aria-current={n === screen ? 'step' : undefined}>
                <span className={styles.progressNo}>{n}</span>
                <span className={styles.progressLabel}>{label}</span>
              </li>
            );
          })}
        </ol>
      )}

      {booking ? (
        <Confirmation locale={locale} booking={booking} tier={bookedTier} />
      ) : screen === 1 ? (
        <ScreenService
          locale={locale}
          services={services}
          loading={servicesRes.loading}
          error={servicesRes.error}
          onRetry={() => setServicesNonce((n) => n + 1)}
          selectedService={service}
          party={party}
          courses={courses}
          activeCourseId={courseId}
          courseNotice={courseNotice}
          loginHref={loginHref}
          partyRef={partyRef}
          canNext={canLeaveService}
          onSelectService={selectService}
          onSelectCourse={selectCourse}
          onSelectParty={setPartyChoice}
          onNext={() => goToScreen(2)}
        />
      ) : screen === 2 && service ? (
        <ScreenSchedule
          locale={locale}
          service={service}
          party={party}
          courseMode={courseId !== null}
          clock={clockRes.data}
          clockError={clockRes.error}
          date={date}
          time={time}
          therapist={therapist}
          therapists={therapists}
          availability={availabilityRes.data}
          availabilityError={availabilityRes.error}
          availabilityLoading={availabilityRes.loading}
          takenError={slotTaken ? confirmError : null}
          canNext={canLeaveSchedule}
          onDate={setDate}
          onTime={pickTime}
          onTherapist={setTherapistChoice}
          onBack={() => goToScreen(1)}
          onNext={leaveScheduleForward}
        />
      ) : service ? (
        <ScreenSummary
          locale={locale}
          service={service}
          party={party}
          courseMode={courseId !== null}
          date={date}
          time={time}
          therapistLabel={therapistLabel}
          isMember={isMember}
          quote={quote}
          quoteError={quoteRes.error}
          quoteLoading={quoteRes.loading}
          hotels={hotelsRes.data?.hotels ?? []}
          pointsSets={pointsSets}
          useBirthday={useBirthday}
          shuttle={shuttle}
          giftDraft={giftDraft}
          giftCode={giftCode}
          guestName={guestName}
          guestPhone={guestPhone}
          loginHref={loginHref}
          confirmError={confirmError}
          slotTaken={slotTaken}
          submitting={submitting}
          onPointsSets={setPointsSets}
          onBirthday={setUseBirthday}
          onShuttle={setShuttle}
          onGiftDraft={setGiftDraft}
          onGiftApply={() => setGiftCode(giftDraft.trim())}
          onGiftRemove={() => {
            setGiftCode('');
            setGiftDraft('');
          }}
          onGuestName={(v) => {
            setGuestName(v);
            clearGuestError();
          }}
          onGuestPhone={(v) => {
            setGuestPhone(v);
            clearGuestError();
          }}
          onBack={() => goToScreen(2)}
          onConfirm={confirm}
        />
      ) : null}
    </div>
  );
}

/** deep link มาก่อน แล้วคอร์สที่ใช้ได้ จึงให้ตัวแรกได้ testid หลัก booking-use-course */
function courseRank(c: CourseSummary, wanted: string | null): number {
  if (c.id === wanted) return 0;
  return usable(c) ? 1 : 2;
}

function therapistName(list: TherapistsResponse['therapists'], id: TherapistId, locale: Locale): string {
  const t = list.find((x) => x.id === id);
  return t ? pick(t.name, locale) : id;
}
