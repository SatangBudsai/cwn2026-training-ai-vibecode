// สร้างการจอง · แชตของ A5 เรียกตัวนี้ · เปิด transaction และลองจัดคนใหม่เองไม่เกิน 3 ครั้ง (D-29)
// ลำดับตรวจตาม API-CONTRACT ข้อ 2.2 · API ตรวจกฎซ้ำเสมอแม้หน้าจอซ่อนไว้ (E28)
import { randomInt } from 'node:crypto';
import type { PoolClient } from 'pg';
import { getService, listTherapists } from '@/lib/catalog';
import { getNow } from '@/lib/clock';
import { bangkokDate, bangkokInstant, yearOf } from '@/lib/date';
import { withTransaction } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { loadAndQuote, type LoadedQuote } from '@/lib/pricing/quote';
import { assignTherapists, type RatedTherapist } from '@/lib/rules/assign';
import { isBookableSlot } from '@/lib/rules/slots';
import {
  assertBookingDate,
  assertCourseRules,
  assertPartySize,
  bookingTypeForParty,
} from '@/lib/booking/availability';
import { getBookingDetail, isUuid } from '@/lib/booking/read';
import type { BookingDetail, CreateBookingRequest, Service, TherapistId } from '@/types';

export interface CreateBookingContext {
  /** null = แขก */
  userId: string | null;
}

/** D-29: ลองใหม่ได้อีกไม่เกิน 3 ครั้งหลังครั้งแรก */
const MAX_RETRIES = 3;
const CODE_LENGTH = 8;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_ATTEMPTS = 5;
const PHONE_RE = /^\d{9,10}$/;

/** D-15: รหัสสุ่ม 8 ตัวอักษร ไม่มีตัวที่อ่านสับสน (0 O 1 I) */
function randomBookingCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

/** ชนกันจาก EXCLUDE · 40P01 เกิดได้เมื่อ 2 transaction แทรกช่วงเวลาทับกันพร้อมกันแล้วรอกันเอง */
function isOverlapConflict(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return code === '23P01' || code === '40P01';
}

function guestInfo(req: CreateBookingRequest): { name: string; phone: string } {
  const name = typeof req.guest?.name === 'string' ? req.guest.name.trim() : '';
  const phone = typeof req.guest?.phone === 'string' ? req.guest.phone.trim() : '';
  if (!name || !phone) throw new ApiError('guest-info-required');
  if (!PHONE_RE.test(phone)) throw new ApiError('phone-invalid');
  return { name, phone };
}

interface BookingPlan {
  req: CreateBookingRequest;
  userId: string | null;
  now: Date;
  today: string;
  service: Service;
  therapists: RatedTherapist[];
  partySize: number;
  guest: { name: string; phone: string } | null;
  chosen: TherapistId | null;
  startAt: Date;
  endAt: Date;
}

/** ขั้น 9: จัดคนจากคิวล่าสุด · ไม่ว่างตอบตามกรณีในสัญญา */
async function pickTherapists(client: PoolClient, plan: BookingPlan): Promise<TherapistId[]> {
  const { service, therapists, partySize, chosen, startAt, endAt } = plan;
  const busy = await client.query<{ therapist_id: string }>(
    `SELECT DISTINCT therapist_id
       FROM booking_items
      WHERE slot_active AND period && tstzrange($1::timestamptz, $2::timestamptz, '[)')`,
    [startAt, endAt],
  );
  const busyIds = new Set(busy.rows.map((r) => r.therapist_id));

  if (chosen) {
    if (!service.therapistIds.includes(chosen)) throw new ApiError('therapist-cannot-perform');
    if (busyIds.has(chosen)) throw new ApiError('slot-taken');
    return [chosen];
  }

  if (partySize === 2) {
    const suite = await client.query(
      `SELECT 1
         FROM bookings
        WHERE is_couple_suite AND status <> 'CANCELLED'
          AND period && tstzrange($1::timestamptz, $2::timestamptz, '[)')
        LIMIT 1`,
      [startAt, endAt],
    );
    if (suite.rows.length > 0) throw new ApiError('slot-taken');
  }

  const assigned = assignTherapists(therapists, busyIds, partySize);
  if (!assigned) throw new ApiError(partySize === 1 ? 'slot-taken' : 'not-enough-therapists');
  return assigned;
}

/** รหัสชนกันแทบไม่เกิด แต่ถ้าเกิดสุ่มใหม่ได้โดยไม่ทำ transaction เสีย · ชน EXCLUDE ยังเป็น error ตามปกติ */
async function insertBooking(client: PoolClient, plan: BookingPlan, loaded: LoadedQuote): Promise<string> {
  const { lines, internal } = loaded;
  const params = [
    plan.userId,
    plan.guest?.name ?? null,
    plan.guest?.phone ?? null,
    plan.service.id,
    bookingTypeForParty(plan.partySize),
    plan.partySize,
    plan.startAt,
    plan.endAt,
    plan.partySize === 2,
    lines.fullPrice,
    lines.discountPercent,
    lines.discountSource,
    lines.discountAmount,
    lines.pointsRedeemed,
    lines.pointsDiscount,
    lines.serviceNet,
    internal.hotelId,
    internal.distanceKm,
    lines.cars,
    lines.transportFee,
    lines.giftCardAmount > 0 ? internal.giftCardId : null,
    lines.giftCardAmount,
    lines.payAtShop,
    loaded.course?.id ?? null,
    plan.now,
  ];
  for (let i = 0; i < CODE_ATTEMPTS; i++) {
    const res = await client.query<{ id: string }>(
      `INSERT INTO bookings (
         booking_code, status, user_id, guest_name, guest_phone, service_id, booking_type, party_size,
         start_at, end_at, is_couple_suite,
         full_price, discount_percent, discount_source, discount_amount,
         points_redeemed, points_discount, service_net,
         hotel_id, distance_km, cars, transport_fee,
         gift_card_id, gift_card_amount, pay_at_shop, course_purchase_id, created_at
       ) VALUES (
         $1, 'CONFIRMED', $2, $3, $4, $5, $6, $7,
         $8, $9, $10,
         $11, $12, $13, $14,
         $15, $16, $17,
         $18, $19, $20, $21,
         $22, $23, $24, $25, $26
       )
       ON CONFLICT (booking_code) DO NOTHING
       RETURNING id`,
      [randomBookingCode(), ...params],
    );
    if (res.rows[0]) return res.rows[0].id;
  }
  throw new ApiError('internal');
}

/** ขั้น 10: หักสิทธิ์ทุกอย่างใน transaction เดียว · แถวถูกล็อกแล้วใน loadAndQuote */
async function applyDeductions(client: PoolClient, plan: BookingPlan, loaded: LoadedQuote, bookingId: string): Promise<void> {
  const { lines, internal } = loaded;
  if (plan.userId && lines.pointsRedeemed > 0) {
    await client.query(`UPDATE users SET points_balance = points_balance - $2 WHERE id = $1`, [
      plan.userId,
      lines.pointsRedeemed,
    ]);
    await client.query(
      `INSERT INTO point_transactions (user_id, booking_id, type, points, created_at)
       VALUES ($1, $2, 'REDEEM', $3, $4)`,
      [plan.userId, bookingId, -lines.pointsRedeemed, plan.now],
    );
  }
  if (loaded.course) {
    await client.query(`UPDATE course_purchases SET reserved_sessions = reserved_sessions + 1 WHERE id = $1`, [
      loaded.course.id,
    ]);
  }
  if (internal.giftCardId && lines.giftCardAmount > 0) {
    await client.query(`UPDATE gift_cards SET balance = balance - $2 WHERE id = $1`, [
      internal.giftCardId,
      lines.giftCardAmount,
    ]);
    await client.query(
      `INSERT INTO gift_card_transactions (gift_card_id, booking_id, type, amount, created_at)
       VALUES ($1, $2, 'REDEEM', $3, $4)`,
      [internal.giftCardId, bookingId, lines.giftCardAmount, plan.now],
    );
  }
  if (plan.userId && loaded.birthday.applied) {
    await client.query(
      `INSERT INTO birthday_redemptions (user_id, benefit_year, booking_id) VALUES ($1, $2, $3)`,
      [plan.userId, yearOf(plan.req.date), bookingId],
    );
  }
}

/** ขั้น 7–10 ใน transaction เดียว */
async function attemptBooking(client: PoolClient, plan: BookingPlan): Promise<BookingDetail> {
  const loaded = await loadAndQuote(client, plan.req, {
    userId: plan.userId,
    today: plan.today,
    now: plan.now,
    forUpdate: true,
  });

  const expected = plan.req.expectedPayAtShop;
  if (expected !== undefined && expected !== null && Number(expected) !== loaded.lines.payAtShop) {
    throw new ApiError('price-changed');
  }

  const therapistIds = await pickTherapists(client, plan);
  const bookingId = await insertBooking(client, plan, loaded);
  for (const [index, therapistId] of therapistIds.entries()) {
    await client.query(
      `INSERT INTO booking_items (booking_id, person_no, therapist_id, period)
       VALUES ($1, $2, $3, tstzrange($4::timestamptz, $5::timestamptz, '[)'))`,
      [bookingId, index + 1, therapistId, plan.startAt, plan.endAt],
    );
  }
  await applyDeductions(client, plan, loaded, bookingId);

  const detail = await getBookingDetail(client, bookingId, plan.now);
  if (!detail) throw new ApiError('internal');
  return detail;
}

/** ผิดกฎ throw ApiError · ชนกัน throw slot-taken */
export async function createBooking(req: CreateBookingRequest, ctx: CreateBookingContext): Promise<BookingDetail> {
  if (typeof req !== 'object' || req === null || Array.isArray(req)) throw new ApiError('validation');
  const { userId } = ctx;

  // 1. จำนวนคน
  assertPartySize(req.partySize);
  const partySize = req.partySize;

  // 2. บริการและเงื่อนไขคอร์ส
  const service = typeof req.serviceId === 'string' ? await getService(req.serviceId) : null;
  if (!service) throw new ApiError('service-not-found');
  assertCourseRules(service, req.coursePurchaseId, userId, partySize);

  // 3. วันที่
  const now = await getNow();
  const today = bangkokDate(now);
  assertBookingDate(req.date, today);

  // 4. รอบ
  if (!isBookableSlot(req.time, service.durationMinutes)) throw new ApiError('invalid-slot');

  // 5. จำนวนคนเกินคนที่ทำบริการได้ทั้งหมด
  if (partySize > service.maxParty) throw new ApiError('not-enough-therapists');

  // 6. แขก
  const guest = userId ? null : guestInfo(req);

  // คอร์สใช้ได้กับ K01 เท่านั้น และรหัสที่ไม่ใช่ uuid ต้องไม่ถึง SQL
  if (req.coursePurchaseId && (service.kind !== 'COURSE' || !isUuid(req.coursePurchaseId))) {
    throw new ApiError('course-not-found');
  }

  // อ่านก่อนเปิด transaction เพราะ catalog ใช้ pool คนละ connection
  const therapists = await listTherapists({ serviceId: service.id });
  const startAt = bangkokInstant(req.date, req.time);
  const picked = partySize === 1 && req.therapistId && req.therapistId !== 'ANY' ? req.therapistId : null;
  const plan: BookingPlan = {
    req,
    userId,
    now,
    today,
    service,
    therapists,
    partySize,
    guest,
    chosen: picked,
    startAt,
    endAt: new Date(startAt.getTime() + service.durationMinutes * 60000),
  };

  for (let attempt = 0; ; attempt++) {
    try {
      return await withTransaction((client) => attemptBooking(client, plan));
    } catch (err) {
      if (!isOverlapConflict(err)) throw err;
      // เลือกคนเองชนแล้วตอบทันที · ระบบจัดคนให้ลองใน transaction ใหม่ (D-29)
      if (plan.chosen || attempt >= MAX_RETRIES) throw new ApiError('slot-taken');
    }
  }
}
