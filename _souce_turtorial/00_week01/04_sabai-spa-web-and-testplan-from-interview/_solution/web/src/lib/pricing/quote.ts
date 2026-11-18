// ตัวเดียวที่ /api/quote, createBooking และแชตเรียก (FR-27, NFR-11)
// ลำดับตรวจตาม API-CONTRACT 2.2 · ลำดับล็อก users → course_purchases → gift_cards
import { bangkokInstant, isValidDateString, isValidTimeString } from '@/lib/date';
import type { Db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { numericToBaht } from '@/lib/money';
import type { BookingType, QuoteRequest, QuoteResponse, ServiceId, ServiceKind } from '@/types';
import { lastBookableDate } from '@/lib/rules/booking-window';
import {
  birthdayEligibility,
  courseValidOn,
  giftCardValidOn,
  loyaltyBase,
  maxRedeemSets,
  parseDistanceKm,
  pointsEarned,
  quote,
  tierFromSpend,
} from './rules';

export interface QuoteContext {
  /** null = แขก (OWNER ส่งเป็น null) */
  userId: string | null;
  /** วันนี้ของเว็บจาก lib/clock */
  today: string;
  /** "ตอนนี้" ของเว็บ ใช้คำนวณ under24h */
  now: Date;
  /** true ใน transaction ของการจอง: ล็อกแถว users → course_purchases → gift_cards ตามลำดับ */
  forUpdate: boolean;
}

export interface LoadedQuote extends QuoteResponse {
  /** ค่าภายในสำหรับ createBooking */
  internal: {
    serviceDurationMinutes: number;
    giftCardId: string | null;
    hotelId: string | null;
    distanceKm: string | null;
  };
}

interface ServiceRow {
  id: ServiceId;
  kind: ServiceKind;
  duration_minutes: number;
  price: string;
  therapist_count: number;
}
interface MemberRow {
  id: string;
  birth_date: string | null;
  lifetime_spend: string;
  points_balance: number;
}
interface CourseRow {
  id: string;
  total_sessions: number;
  used_sessions: number;
  reserved_sessions: number;
  purchased_on: string;
  expires_on: string;
}
interface GiftCardRow {
  id: string;
  code: string;
  balance: string;
  purchased_on: string;
  expires_on: string;
}
interface ResolvedShuttle {
  hotelId: string | null;
  distanceTenths: number;
  distanceKm: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_MS = 24 * 60 * 60 * 1000;

function bookingTypeOf(partySize: number): BookingType {
  if (partySize === 1) return 'SINGLE';
  return partySize === 2 ? 'COUPLE' : 'GROUP';
}

function checkPartySize(partySize: unknown): number {
  if (typeof partySize !== 'number' || !Number.isInteger(partySize) || partySize < 1) throw new ApiError('validation');
  if (partySize >= 7) throw new ApiError('party-too-large-call');
  return partySize;
}

function checkDate(date: unknown, today: string): string {
  if (!isValidDateString(date)) throw new ApiError('validation');
  if (date <= today) throw new ApiError('same-day-call');
  if (date > lastBookableDate(today)) throw new ApiError('date-out-of-range');
  return date;
}

function readPoints(points: unknown): number {
  if (points === undefined || points === null) return 0;
  if (typeof points !== 'number' || !Number.isFinite(points)) throw new ApiError('validation');
  return points;
}

function isUnder24h(date: string, time: string | undefined, now: Date): boolean {
  if (!time) return false;
  if (!isValidTimeString(time)) throw new ApiError('validation');
  return bangkokInstant(date, time).getTime() - now.getTime() < DAY_MS;
}

/** จำนวนคนสูงสุดนับจาก therapist_services (BR-11, BR-12) */
async function loadService(db: Db, serviceId: unknown): Promise<ServiceRow> {
  if (typeof serviceId !== 'string') throw new ApiError('service-not-found');
  const { rows } = await db.query<ServiceRow>(
    `SELECT s.id, s.kind, s.duration_minutes, s.price,
            (SELECT count(*)::int FROM therapist_services ts WHERE ts.service_id = s.id) AS therapist_count
       FROM services s
      WHERE s.id = $1`,
    [serviceId],
  );
  if (!rows[0]) throw new ApiError('service-not-found');
  return rows[0];
}

async function loadMember(db: Db, userId: string, forUpdate: boolean): Promise<MemberRow> {
  const { rows } = await db.query<MemberRow>(
    `SELECT id, birth_date, lifetime_spend, points_balance FROM users WHERE id = $1${forUpdate ? ' FOR UPDATE' : ''}`,
    [userId],
  );
  // cookie ยังอยู่แต่บัญชีไม่มีแล้ว
  if (!rows[0]) throw new ApiError('unauthorized');
  return rows[0];
}

async function loadUsedBirthdayYears(db: Db, userId: string): Promise<number[]> {
  const { rows } = await db.query<{ benefit_year: number }>(
    `SELECT benefit_year FROM birthday_redemptions WHERE user_id = $1 AND released_at IS NULL`,
    [userId],
  );
  return rows.map((row) => row.benefit_year);
}

function courseRemaining(course: CourseRow): number {
  return course.total_sessions - course.used_sessions - course.reserved_sessions;
}

/** ตรวจ used-up ก่อน expired (สัญญา 2.3) · อายุดูจากวันนัด (BR-40) */
async function loadCourse(
  db: Db,
  courseId: string,
  userId: string,
  serviceId: ServiceId,
  appointmentDate: string,
  forUpdate: boolean,
): Promise<CourseRow> {
  if (!UUID_RE.test(courseId)) throw new ApiError('course-not-found');
  const { rows } = await db.query<CourseRow>(
    `SELECT id, total_sessions, used_sessions, reserved_sessions, purchased_on, expires_on
       FROM course_purchases
      WHERE id = $1 AND user_id = $2 AND service_id = $3${forUpdate ? ' FOR UPDATE' : ''}`,
    [courseId, userId, serviceId],
  );
  const course = rows[0];
  if (!course) throw new ApiError('course-not-found');
  if (courseRemaining(course) <= 0) throw new ApiError('course-used-up');
  if (!courseValidOn(course.purchased_on, appointmentDate)) throw new ApiError('course-expired');
  return course;
}

/** อายุดูจากวันจอง ไม่ใช่วันนัด (D-06, E208) */
async function loadGiftCard(db: Db, code: string, today: string, forUpdate: boolean): Promise<GiftCardRow> {
  const { rows } = await db.query<GiftCardRow>(
    `SELECT id, code, balance, purchased_on, expires_on FROM gift_cards WHERE code = $1${forUpdate ? ' FOR UPDATE' : ''}`,
    [code],
  );
  const card = rows[0];
  if (!card) throw new ApiError('giftcard-not-found');
  if (!giftCardValidOn(card.purchased_on, today)) throw new ApiError('giftcard-expired');
  if (numericToBaht(card.balance) <= 0) throw new ApiError('giftcard-empty');
  return card;
}

/** ส่งทั้งคู่ใช้ hotelId · P01 ต้องมีระยะเสมอ (FR-52) · ค่าเกิน 15.0 ถูกปฏิเสธใน quote() */
async function resolveShuttle(db: Db, input: QuoteRequest['shuttle'], kind: ServiceKind): Promise<ResolvedShuttle | null> {
  if (input === undefined || input === null) {
    if (kind === 'PACKAGE') throw new ApiError('distance-required');
    return null;
  }
  if (input.hotelId) {
    const { rows } = await db.query<{ id: string; distance_km: string }>(
      `SELECT id, distance_km FROM hotels WHERE id = $1`,
      [input.hotelId],
    );
    if (!rows[0]) throw new ApiError('hotel-not-found');
    return toResolved(rows[0].id, rows[0].distance_km);
  }
  // type ระบุ string แต่สัญญารับ number ด้วย จึง String() ก่อนตรวจจากข้อความ
  const text = String(input.distanceKm ?? '').trim();
  if (!text) throw new ApiError('distance-required');
  return toResolved(null, text);
}

function toResolved(hotelId: string | null, text: string): ResolvedShuttle {
  const distanceTenths = parseDistanceKm(text);
  return {
    hotelId,
    distanceTenths,
    distanceKm: `${Math.floor(distanceTenths / 10)}.${distanceTenths % 10}`,
  };
}

/** อ่านข้อมูลผู้จอง บริการ โรงแรม บัตร คอร์ส แล้วเรียก quote() · ผิดกฎ throw ApiError */
export async function loadAndQuote(db: Db, req: QuoteRequest, ctx: QuoteContext): Promise<LoadedQuote> {
  const partySize = checkPartySize(req.partySize);
  const service = await loadService(db, req.serviceId);

  const courseId = req.coursePurchaseId ? String(req.coursePurchaseId) : null;
  if (service.kind === 'COURSE' && !courseId) throw new ApiError('course-required');
  if (courseId && !ctx.userId) throw new ApiError('course-login-required');
  if (courseId && partySize > 1) throw new ApiError('course-one-person');

  const date = checkDate(req.date, ctx.today);
  if (partySize > service.therapist_count) throw new ApiError('not-enough-therapists');
  const under24h = isUnder24h(date, req.time, ctx.now);
  const pointsToRedeem = readPoints(req.pointsToRedeem);

  // ลำดับล็อก: users → course_purchases → gift_cards
  const member = ctx.userId ? await loadMember(db, ctx.userId, ctx.forUpdate) : null;
  const course =
    courseId && member ? await loadCourse(db, courseId, member.id, service.id, date, ctx.forUpdate) : null;
  const shuttle = await resolveShuttle(db, req.shuttle, service.kind);
  const giftCardCode = String(req.giftCardCode ?? '').trim();
  const giftCard = giftCardCode ? await loadGiftCard(db, giftCardCode, ctx.today, ctx.forUpdate) : null;

  const usedYears = member ? await loadUsedBirthdayYears(db, member.id) : [];
  const birthday = birthdayEligibility({
    birthDate: member?.birth_date ?? null,
    appointmentDate: date,
    kind: service.kind,
    usedYears,
  });

  const lifetimeSpendBaht = member ? numericToBaht(member.lifetime_spend) : null;
  const pointsBalance = member?.points_balance ?? 0;
  const giftCardBalanceBaht = giftCard ? numericToBaht(giftCard.balance) : null;

  const lines = quote({
    unitPriceBaht: numericToBaht(service.price),
    partySize,
    kind: service.kind,
    isCourseBooking: course !== null,
    lifetimeSpendBaht,
    birthdayApplies: req.useBirthday === true && birthday.eligible,
    pointsToRedeem,
    pointsBalance,
    distanceTenths: shuttle?.distanceTenths ?? null,
    giftCardBalanceBaht,
  });

  const maxSets = maxRedeemSets(pointsBalance, lines.fullPrice - lines.discountAmount);

  return {
    serviceId: service.id,
    partySize,
    bookingType: bookingTypeOf(partySize),
    isCoupleSuite: partySize === 2,
    lines,
    tier: lifetimeSpendBaht === null ? null : tierFromSpend(lifetimeSpendBaht),
    birthday: {
      offered: member !== null && service.kind === 'SERVICE',
      eligible: birthday.eligible,
      applied: lines.discountSource === 'BIRTHDAY',
      reason: birthday.reason,
    },
    points: {
      balance: pointsBalance,
      maxSets,
      maxRedeemable: maxSets * 100,
    },
    giftCard:
      giftCard && giftCardBalanceBaht !== null
        ? {
            code: giftCard.code,
            balanceBefore: giftCardBalanceBaht,
            amountUsed: lines.giftCardAmount,
            balanceAfter: giftCardBalanceBaht - lines.giftCardAmount,
            expiresOn: giftCard.expires_on,
          }
        : null,
    course: course ? { id: course.id, remaining: courseRemaining(course), expiresOn: course.expires_on } : null,
    pointsEarnedPreview:
      member && !course ? pointsEarned(loyaltyBase(lines.serviceNet, lines.giftCardAmount)) : 0,
    under24h,
    internal: {
      serviceDurationMinutes: service.duration_minutes,
      giftCardId: giftCard?.id ?? null,
      hotelId: shuttle?.hotelId ?? null,
      distanceKm: shuttle?.distanceKm ?? null,
    },
  };
}
