// GET /api/availability · SELECT เพื่อแสดงผลเท่านั้น EXCLUDE ของฐานข้อมูลเป็นด่านสุดท้าย (DESIGN ข้อ 4)
import { courseValidOn } from '@/lib/pricing/rules';
import { listTherapists, getService } from '@/lib/catalog';
import { getNow } from '@/lib/clock';
import { addDays, bangkokDate, bangkokInstant, isValidDateString } from '@/lib/date';
import { getPool, query, type Db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { isUuid } from '@/lib/booking/read';
import { computeSlots, type DayOccupancy } from '@/lib/rules/assign';
import type { AvailabilityResponse, BookingType, Service } from '@/types';
import { lastBookableDate } from '@/lib/rules/booking-window';

/** 1 คน SINGLE · 2 คน COUPLE · 3–6 คน GROUP (BR-08, BR-09) */
export function bookingTypeForParty(partySize: number): BookingType {
  if (partySize === 1) return 'SINGLE';
  return partySize === 2 ? 'COUPLE' : 'GROUP';
}

/** ขั้น 1: ≥7 ให้โทรร้าน · <1 หรือไม่ใช่จำนวนเต็ม validation (BR-10) */
export function assertPartySize(partySize: unknown): asserts partySize is number {
  if (typeof partySize !== 'number' || !Number.isInteger(partySize) || partySize < 1) throw new ApiError('validation');
  if (partySize >= 7) throw new ApiError('party-too-large-call');
}

/** ขั้น 2: K01 ต้องมีคอร์ส · ใช้คอร์สต้องเข้าสู่ระบบ · คอร์สจองได้ครั้งละ 1 คน */
export function assertCourseRules(
  service: Pick<Service, 'kind'>,
  courseId: string | null | undefined,
  userId: string | null,
  partySize: number,
): void {
  if (service.kind === 'COURSE' && !courseId) throw new ApiError('course-required');
  if (!courseId) return;
  if (!userId) throw new ApiError('course-login-required');
  if (partySize !== 1) throw new ApiError('course-one-person');
}

/** ขั้น 3: จองได้ตั้งแต่พรุ่งนี้ถึงวันนี้ + 30 (BR-03, BR-04, FR-04) */
export function assertBookingDate(date: unknown, today: string): asserts date is string {
  if (!isValidDateString(date)) throw new ApiError('validation');
  if (date <= today) throw new ApiError('same-day-call');
  if (date > lastBookableDate(today)) throw new ApiError('date-out-of-range');
}

interface CourseRow {
  total_sessions: number;
  used_sessions: number;
  reserved_sessions: number;
  purchased_on: string;
}

/** คอร์สต้องเป็นของผู้ใช้และใช้กับบริการนี้ได้ · ตรวจ used-up ก่อน expired (BR-39, BR-40) */
async function assertCourseUsable(courseId: string, userId: string, serviceId: string, date: string): Promise<void> {
  if (!isUuid(courseId)) throw new ApiError('course-not-found');
  const res = await query<CourseRow>(
    `SELECT total_sessions, used_sessions, reserved_sessions, purchased_on
       FROM course_purchases
      WHERE id = $1 AND user_id = $2 AND service_id = $3`,
    [courseId, userId, serviceId],
  );
  const course = res.rows[0];
  if (!course) throw new ApiError('course-not-found');
  if (course.total_sessions - course.used_sessions - course.reserved_sessions <= 0) {
    throw new ApiError('course-used-up');
  }
  if (!courseValidOn(course.purchased_on, date)) throw new ApiError('course-expired');
}

/** คิวและ Couple Suite ของวันนั้น · คิวที่ COMPLETED ยังกันรอบ (slot_active ยัง true) */
async function loadDayOccupancy(db: Db, date: string): Promise<DayOccupancy> {
  const dayStart = bangkokInstant(date, '00:00');
  const dayEnd = bangkokInstant(addDays(date, 1), '00:00');
  const items = await db.query<{ therapist_id: string; start_at: Date; end_at: Date }>(
    `SELECT therapist_id, lower(period) AS start_at, upper(period) AS end_at
       FROM booking_items
      WHERE slot_active AND period && tstzrange($1::timestamptz, $2::timestamptz, '[)')`,
    [dayStart, dayEnd],
  );
  const suite = await db.query<{ start_at: Date; end_at: Date }>(
    `SELECT start_at, end_at
       FROM bookings
      WHERE is_couple_suite AND status <> 'CANCELLED'
        AND period && tstzrange($1::timestamptz, $2::timestamptz, '[)')`,
    [dayStart, dayEnd],
  );
  return {
    therapists: items.rows.map((r) => ({
      therapistId: r.therapist_id,
      start: r.start_at.getTime(),
      end: r.end_at.getTime(),
    })),
    suite: suite.rows.map((r) => ({ start: r.start_at.getTime(), end: r.end_at.getTime() })),
  };
}

export interface AvailabilityQuery {
  service: string | null;
  date: string | null;
  party: string | null;
  therapist: string | null;
  course: string | null;
}

function parseParty(party: string | null): number {
  if (party === null || party === '') return 1;
  if (!/^\d+$/.test(party)) throw new ApiError('validation');
  return Number(party);
}

/** userId = null เมื่อเป็นแขกหรือ OWNER · ลำดับตรวจเหมือน POST /api/bookings ขั้น 1–3 */
export async function getAvailability(q: AvailabilityQuery, userId: string | null): Promise<AvailabilityResponse> {
  const partySize = parseParty(q.party);
  assertPartySize(partySize);

  const service = q.service ? await getService(q.service) : null;
  if (!service) throw new ApiError('service-not-found');
  assertCourseRules(service, q.course, userId, partySize);

  const today = bangkokDate(await getNow());
  assertBookingDate(q.date, today);
  const date = q.date;

  // ทุกคอร์สเป็นของ K01 จึงเทียบ service_id ได้เลย: บริการอื่นพร้อมคอร์สตอบ course-not-found
  if (q.course && userId) await assertCourseUsable(q.course, userId, service.id, date);

  const therapists = await listTherapists({ serviceId: service.id });
  const base = {
    serviceId: service.id,
    date,
    partySize,
    bookingType: bookingTypeForParty(partySize),
    maxParty: service.maxParty,
    therapists,
  };
  // เกินจำนวนคนที่ทำบริการได้ไม่มีรอบที่จองได้จริง (E48, E55, E56) · error นี้เป็นของ POST ขั้น 5
  if (partySize > service.maxParty) return { ...base, slots: [] };

  const occupancy = await loadDayOccupancy(getPool(), date);
  const chosen = q.therapist && q.therapist !== 'ANY' ? q.therapist : null;
  const slots = computeSlots({
    date,
    durationMinutes: service.durationMinutes,
    partySize,
    therapists,
    therapistId: chosen,
    occupancy,
  });
  return { ...base, slots };
}
