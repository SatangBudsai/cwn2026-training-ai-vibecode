// ยกเลิกการจองตาม DESIGN 3.2 · ยกเลิกได้ทั้งการจองเท่านั้น (FR-24) · ไม่มีการเปลี่ยนเวลานัด (FR-25)
import type { PoolClient } from 'pg';
import { getNow } from '@/lib/clock';
import { withTransaction } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { numericToBaht } from '@/lib/money';
import { cancelState, getBookingDetail, isUuid } from '@/lib/booking/read';
import type { BookingStatus, CancelResponse } from '@/types';

interface LockRefs {
  id: string;
  user_id: string | null;
  course_purchase_id: string | null;
  gift_card_id: string | null;
}

interface CancelRow {
  status: BookingStatus;
  start_at: Date;
  points_redeemed: number;
  gift_card_amount: string;
}

/**
 * ล็อกตามลำดับ users → course_purchases → gift_cards แล้วจึงล็อกการจอง
 * อ่านสถานะหลังได้ล็อกครบ กดซ้ำพร้อมกันจึงเห็นค่าล่าสุดและคืนสิทธิ์ครั้งเดียว
 */
async function cancelInTransaction(client: PoolClient, refs: LockRefs): Promise<CancelResponse> {
  if (refs.user_id) {
    await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [refs.user_id]);
  }
  if (refs.course_purchase_id) {
    await client.query(`SELECT id FROM course_purchases WHERE id = $1 FOR UPDATE`, [refs.course_purchase_id]);
  }
  if (refs.gift_card_id) {
    await client.query(`SELECT id FROM gift_cards WHERE id = $1 FOR UPDATE`, [refs.gift_card_id]);
  }
  const res = await client.query<CancelRow>(
    `SELECT status, start_at, points_redeemed, gift_card_amount FROM bookings WHERE id = $1 FOR UPDATE`,
    [refs.id],
  );
  const booking = res.rows[0];
  if (!booking) throw new ApiError('booking-not-found');

  // ตามนาฬิกาของเว็บ · เหลือไม่ถึง 24:00 ไม่คิดค่าปรับและไม่คืนสิทธิ์ (FR-21, FR-23)
  const now = await getNow(client);
  const state = cancelState(booking.status, booking.start_at, now);
  if (state.cancelBlockedReason === 'not-confirmed') throw new ApiError('booking-not-cancellable');
  if (state.cancelBlockedReason === 'under-24h') throw new ApiError('cancel-too-late');

  await client.query(`UPDATE bookings SET status = 'CANCELLED' WHERE id = $1`, [refs.id]);
  await client.query(`UPDATE booking_items SET slot_active = false WHERE booking_id = $1`, [refs.id]);

  let sessions = 0;
  if (refs.course_purchase_id) {
    await client.query(`UPDATE course_purchases SET reserved_sessions = reserved_sessions - 1 WHERE id = $1`, [
      refs.course_purchase_id,
    ]);
    sessions = 1;
  }

  const points = booking.points_redeemed;
  if (refs.user_id && points > 0) {
    await client.query(`UPDATE users SET points_balance = points_balance + $2 WHERE id = $1`, [refs.user_id, points]);
    await client.query(
      `INSERT INTO point_transactions (user_id, booking_id, type, points, created_at)
       VALUES ($1, $2, 'REFUND', $3, $4)`,
      [refs.user_id, refs.id, points, now],
    );
  }

  // คืนยอดตามจริง ไม่แตะ expires_on จึงอาจใช้ต่อไม่ได้ (D-05, E77)
  const giftCardAmount = numericToBaht(booking.gift_card_amount);
  if (refs.gift_card_id && giftCardAmount > 0) {
    await client.query(`UPDATE gift_cards SET balance = balance + $2 WHERE id = $1`, [
      refs.gift_card_id,
      booking.gift_card_amount,
    ]);
    await client.query(
      `INSERT INTO gift_card_transactions (gift_card_id, booking_id, type, amount, created_at)
       VALUES ($1, $2, 'REFUND', $3, $4)`,
      [refs.gift_card_id, refs.id, booking.gift_card_amount, now],
    );
  }

  const birthday = await client.query(
    `UPDATE birthday_redemptions SET released_at = $2 WHERE booking_id = $1 AND released_at IS NULL`,
    [refs.id, now],
  );

  const detail = await getBookingDetail(client, refs.id, now);
  if (!detail) throw new ApiError('booking-not-found');
  return {
    booking: detail,
    refunded: { sessions, points, giftCardAmount, birthday: (birthday.rowCount ?? 0) > 0 },
  };
}

const REFS_SELECT = `SELECT id, user_id, course_purchase_id, gift_card_id FROM bookings`;

/** สมาชิกยกเลิกของตัวเอง · ของคนอื่นตอบเหมือนไม่พบ (NFR-12) */
export async function cancelMemberBooking(bookingId: string, userId: string): Promise<CancelResponse> {
  if (!isUuid(bookingId)) throw new ApiError('booking-not-found');
  return withTransaction(async (client) => {
    const res = await client.query<LockRefs>(`${REFS_SELECT} WHERE id = $1 AND user_id = $2`, [bookingId, userId]);
    if (!res.rows[0]) throw new ApiError('booking-not-found');
    return cancelInTransaction(client, res.rows[0]);
  });
}

/** แขกยกเลิกด้วยรหัสและเบอร์ · รหัสหรือเบอร์ไม่ตรง หรือเป็นการจองของสมาชิก ตอบไม่พบ (FR-26, E80) */
export async function cancelGuestBooking(bookingCode: unknown, phone: unknown): Promise<CancelResponse> {
  if (typeof bookingCode !== 'string' || typeof phone !== 'string') throw new ApiError('booking-not-found');
  const code = bookingCode.trim().toUpperCase();
  const guestPhone = phone.trim();
  if (!code || !guestPhone) throw new ApiError('booking-not-found');
  return withTransaction(async (client) => {
    const res = await client.query<LockRefs>(
      `${REFS_SELECT} WHERE booking_code = $1 AND guest_phone = $2 AND user_id IS NULL`,
      [code, guestPhone],
    );
    if (!res.rows[0]) throw new ApiError('booking-not-found');
    return cancelInTransaction(client, res.rows[0]);
  });
}
