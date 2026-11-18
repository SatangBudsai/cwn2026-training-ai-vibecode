// ร้านกด "ใช้บริการเสร็จ" ตาม DESIGN 3.4 และ 5.2 · แต้ม ยอดสะสม และการตัดครั้งคอร์สเกิดที่นี่จุดเดียว
import { getBookingDetail } from '@/lib/booking/read';
import { getNow } from '@/lib/clock';
import { withTransaction, type Db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { numericToBaht } from '@/lib/money';
import { loyaltyBase, pointsEarned, tierFromSpend } from '@/lib/pricing/rules';
import { runtimeProfile } from '@/lib/env';
import type { CompleteBookingResponse } from '@/types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** UPDATE ไม่โดนแถวใด: แยกสาเหตุจากสถานะปัจจุบัน */
function notConfirmedError(status: string | undefined): ApiError {
  if (status === 'COMPLETED') return new ApiError('already-completed');
  if (status === 'CANCELLED') return new ApiError('booking-not-cancellable');
  return new ApiError('booking-not-found');
}

function spendIncrease(serviceNetBaht: number, baseBaht: number): number {
  return runtimeProfile() === '0' ? baseBaht : serviceNetBaht;
}

/**
 * ทำใน transaction ที่เปิดไว้แล้ว · ล็อก users → course_purchases แล้วจึงแตะ bookings เหมือนการจองและการยกเลิกของ A1
 * กดซ้ำพร้อมกัน หรือกดเสร็จชนกับยกเลิก: อีกฝั่งรอ lock แล้ว UPDATE ได้ 0 แถว จึงไม่มีทางให้แต้มซ้ำ (E247)
 */
export async function completeBookingTx(db: Db, bookingId: string, now: Date): Promise<CompleteBookingResponse> {
  if (!UUID_PATTERN.test(bookingId)) throw new ApiError('booking-not-found');

  // ผู้จองและคอร์สของการจองไม่เปลี่ยนหลังสร้าง จึงอ่านก่อนได้โดยไม่ล็อก เพื่อรู้ว่าต้องล็อกแถวไหน
  const refs = await db.query<{ user_id: string | null; course_purchase_id: string | null }>(
    `SELECT user_id, course_purchase_id FROM bookings WHERE id = $1`,
    [bookingId],
  );
  if (!refs.rows[0]) throw new ApiError('booking-not-found');
  const { user_id: userId, course_purchase_id: courseId } = refs.rows[0];

  const lockedUser = userId
    ? await db.query<{ lifetime_spend: string; points_balance: number }>(
        `SELECT lifetime_spend, points_balance FROM users WHERE id = $1 FOR UPDATE`,
        [userId],
      )
    : null;
  if (courseId) {
    await db.query(`SELECT id FROM course_purchases WHERE id = $1 FOR UPDATE`, [courseId]);
  }

  const updated = await db.query<{ service_net: string; gift_card_amount: string }>(
    `UPDATE bookings SET status = 'COMPLETED', completed_at = $2
      WHERE id = $1 AND status = 'CONFIRMED'
      RETURNING service_net, gift_card_amount`,
    [bookingId, now],
  );
  const booking = updated.rows[0];
  if (!booking) {
    const current = await db.query<{ status: string }>(`SELECT status FROM bookings WHERE id = $1`, [bookingId]);
    throw notConfirmedError(current.rows[0]?.status);
  }

  const isCourse = courseId !== null;
  let earned = 0;
  let member: CompleteBookingResponse['member'] = null;
  let course: CompleteBookingResponse['course'] = null;

  if (userId && lockedUser) {
    let lifetimeSpend = numericToBaht(lockedUser.rows[0].lifetime_spend);
    let pointsBalance = lockedUser.rows[0].points_balance;

    // จองด้วยคอร์ส 0 แต้ม ยอดไม่เพิ่ม (FR-79, E195) แม้จ่ายค่ารถ (D-09)
    if (!isCourse) {
      const base = loyaltyBase(numericToBaht(booking.service_net), numericToBaht(booking.gift_card_amount));
      earned = pointsEarned(base);
      const after = await db.query<{ lifetime_spend: string; points_balance: number }>(
        `UPDATE users SET lifetime_spend = lifetime_spend + $2, points_balance = points_balance + $3
          WHERE id = $1
          RETURNING lifetime_spend, points_balance`,
        [userId, spendIncrease(numericToBaht(booking.service_net), base), earned],
      );
      lifetimeSpend = numericToBaht(after.rows[0].lifetime_spend);
      pointsBalance = after.rows[0].points_balance;
      if (earned > 0) {
        await db.query(
          `INSERT INTO point_transactions (user_id, booking_id, type, points, created_at)
           VALUES ($1, $2, 'EARN', $3, $4)`,
          [userId, bookingId, earned, now],
        );
        await db.query(`UPDATE bookings SET points_earned = $2 WHERE id = $1`, [bookingId, earned]);
      }
    }
    member = { lifetimeSpend, pointsBalance, tier: tierFromSpend(lifetimeSpend) };
  }

  if (isCourse) {
    const cut = await db.query<{ total_sessions: number; used_sessions: number; reserved_sessions: number }>(
      `UPDATE course_purchases
          SET reserved_sessions = reserved_sessions - 1, used_sessions = used_sessions + 1
        WHERE id = $1
        RETURNING total_sessions, used_sessions, reserved_sessions`,
      [courseId],
    );
    const c = cut.rows[0];
    course = {
      remaining: c.total_sessions - c.used_sessions - c.reserved_sessions,
      usedSessions: c.used_sessions,
      reservedSessions: c.reserved_sessions,
    };
  }

  const detail = await getBookingDetail(db, bookingId, now);
  if (!detail) throw new ApiError('internal');
  return { booking: detail, pointsEarned: earned, member, course };
}

/** D-04: ตรวจแค่สถานะ ไม่ตรวจเวลานัด */
export async function completeBooking(bookingId: string): Promise<CompleteBookingResponse> {
  return withTransaction(async (client) => completeBookingTx(client, bookingId, await getNow(client)));
}
