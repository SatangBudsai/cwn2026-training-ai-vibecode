// อ่าน BookingDetail รูปเดียวกันทุก API (NFR-11) · A3, A4 เรียกตัวนี้
import type { Db } from '@/lib/db';
import { bangkokDate, bangkokIso, bangkokTime } from '@/lib/date';
import { numericToBaht } from '@/lib/money';
import type {
  BookingDetail,
  BookingStatus,
  BookingTherapist,
  BookingType,
  DiscountSource,
  HotelId,
  PriceLines,
  ServiceId,
  TherapistId,
} from '@/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** กันค่าที่ไม่ใช่ uuid ก่อนถึง SQL ไม่งั้น PostgreSQL ตอบ 22P02 กลายเป็น 500 */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** BR-14: เหลืออย่างน้อย 24:00 ตามนาฬิกาของเว็บ · 24:00 พอดีได้ */
export function cancelState(
  status: BookingStatus,
  startAt: Date,
  now: Date,
): Pick<BookingDetail, 'canCancel' | 'cancelBlockedReason'> {
  if (status !== 'CONFIRMED') return { canCancel: false, cancelBlockedReason: 'not-confirmed' };
  if (startAt.getTime() - now.getTime() < DAY_MS) return { canCancel: false, cancelBlockedReason: 'under-24h' };
  return { canCancel: true, cancelBlockedReason: null };
}

interface BookingRow {
  id: string;
  booking_code: string;
  user_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  service_id: string;
  booking_type: string;
  party_size: number;
  start_at: Date;
  end_at: Date;
  is_couple_suite: boolean;
  status: string;
  full_price: string;
  discount_percent: number;
  discount_source: string;
  discount_amount: string;
  points_redeemed: number;
  points_discount: string;
  service_net: string;
  hotel_id: string | null;
  distance_km: string | null;
  cars: number;
  transport_fee: string;
  gift_card_amount: string;
  pay_at_shop: string;
  course_purchase_id: string | null;
  points_earned: number;
  completed_at: Date | null;
  service_name_th: string;
  service_name_en: string;
  service_name_zh: string;
  hotel_name_th: string | null;
  hotel_name_en: string | null;
  hotel_name_zh: string | null;
  gift_card_code: string | null;
}

interface ItemRow {
  booking_id: string;
  person_no: number;
  therapist_id: string;
  name_th: string;
  name_en: string;
  name_zh: string;
  photo_path: string;
}

const BOOKING_SELECT = `
  SELECT b.id, b.booking_code, b.user_id, b.guest_name, b.guest_phone, b.service_id, b.booking_type,
         b.party_size, b.start_at, b.end_at, b.is_couple_suite, b.status,
         b.full_price, b.discount_percent, b.discount_source, b.discount_amount,
         b.points_redeemed, b.points_discount, b.service_net,
         b.hotel_id, b.distance_km, b.cars, b.transport_fee,
         b.gift_card_amount, b.pay_at_shop, b.course_purchase_id, b.points_earned, b.completed_at,
         s.name_th AS service_name_th, s.name_en AS service_name_en, s.name_zh AS service_name_zh,
         h.name_th AS hotel_name_th, h.name_en AS hotel_name_en, h.name_zh AS hotel_name_zh,
         g.code AS gift_card_code
    FROM bookings b
    JOIN services s ON s.id = b.service_id
    LEFT JOIN hotels h ON h.id = b.hotel_id
    LEFT JOIN gift_cards g ON g.id = b.gift_card_id`;

function toLines(row: BookingRow): PriceLines {
  const serviceNet = numericToBaht(row.service_net);
  const transportFee = numericToBaht(row.transport_fee);
  return {
    fullPrice: numericToBaht(row.full_price),
    discountPercent: row.discount_percent as PriceLines['discountPercent'],
    discountSource: row.discount_source as DiscountSource,
    discountAmount: numericToBaht(row.discount_amount),
    pointsRedeemed: row.points_redeemed,
    pointsDiscount: numericToBaht(row.points_discount),
    serviceNet,
    cars: row.cars,
    transportFee,
    totalBeforeGiftCard: serviceNet + transportFee,
    giftCardAmount: numericToBaht(row.gift_card_amount),
    payAtShop: numericToBaht(row.pay_at_shop),
  };
}

function toDetail(row: BookingRow, items: ItemRow[], now: Date): BookingDetail {
  const status = row.status as BookingStatus;
  const therapists: BookingTherapist[] = items.map((item) => ({
    personNo: item.person_no,
    id: item.therapist_id as TherapistId,
    name: { th: item.name_th, en: item.name_en, zh: item.name_zh },
    photoPath: item.photo_path,
  }));
  return {
    id: row.id,
    bookingCode: row.booking_code,
    userId: row.user_id,
    guestName: row.guest_name,
    guestPhone: row.guest_phone,
    serviceId: row.service_id as ServiceId,
    serviceName: { th: row.service_name_th, en: row.service_name_en, zh: row.service_name_zh },
    bookingType: row.booking_type as BookingType,
    partySize: row.party_size,
    date: bangkokDate(row.start_at),
    time: bangkokTime(row.start_at),
    endTime: bangkokTime(row.end_at),
    startAt: bangkokIso(row.start_at),
    endAt: bangkokIso(row.end_at),
    isCoupleSuite: row.is_couple_suite,
    status,
    therapists,
    lines: toLines(row),
    hotelId: row.hotel_id as HotelId | null,
    hotelName:
      row.hotel_name_th !== null && row.hotel_name_en !== null && row.hotel_name_zh !== null
        ? { th: row.hotel_name_th, en: row.hotel_name_en, zh: row.hotel_name_zh }
        : null,
    distanceKm: row.distance_km,
    giftCardCode: row.gift_card_code,
    coursePurchaseId: row.course_purchase_id,
    pointsEarned: row.points_earned,
    completedAt: row.completed_at ? bangkokIso(row.completed_at) : null,
    ...cancelState(status, row.start_at, now),
  };
}

async function withItems(db: Db, rows: BookingRow[], now: Date): Promise<BookingDetail[]> {
  if (rows.length === 0) return [];
  const res = await db.query<ItemRow>(
    `SELECT i.booking_id, i.person_no, i.therapist_id, t.name_th, t.name_en, t.name_zh, t.photo_path
       FROM booking_items i
       JOIN therapists t ON t.id = i.therapist_id
      WHERE i.booking_id = ANY($1::uuid[])
      ORDER BY i.booking_id, i.person_no`,
    [rows.map((r) => r.id)],
  );
  const byBooking = new Map<string, ItemRow[]>();
  for (const item of res.rows) {
    const list = byBooking.get(item.booking_id);
    if (list) list.push(item);
    else byBooking.set(item.booking_id, [item]);
  }
  return rows.map((row) => toDetail(row, byBooking.get(row.id) ?? [], now));
}

/** null เมื่อไม่พบ · now ใช้คำนวณ canCancel */
export async function getBookingDetail(db: Db, id: string, now: Date): Promise<BookingDetail | null> {
  if (!isUuid(id)) return null;
  const res = await db.query<BookingRow>(`${BOOKING_SELECT} WHERE b.id = $1`, [id]);
  const [detail] = await withItems(db, res.rows, now);
  return detail ?? null;
}

/** เรียงตามวันนัด จากใกล้ไปไกล */
export async function listBookingsForUser(
  db: Db,
  userId: string,
  statuses: BookingStatus[],
  now: Date,
): Promise<BookingDetail[]> {
  const res = await db.query<BookingRow>(
    `${BOOKING_SELECT} WHERE b.user_id = $1 AND b.status = ANY($2::text[]) ORDER BY b.start_at, b.id`,
    [userId, statuses],
  );
  return withItems(db, res.rows, now);
}
