// ตารางคิวรายวันของหลังร้าน (FR-78) · ยอดมาจาก getBookingDetail จึงตรงกับที่ลูกค้าเห็น (NFR-11)
import { getBookingDetail } from '@/lib/booking/read';
import { getNow } from '@/lib/clock';
import { addDays, bangkokDate, bangkokInstant, isValidDateString } from '@/lib/date';
import { getPool } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { AdminBooking, AdminScheduleResponse, TherapistId } from '@/types';

/** date ว่างหรือไม่ส่ง = วันนี้ของเว็บ */
export async function getAdminSchedule(date: string | null): Promise<AdminScheduleResponse> {
  if (date && !isValidDateString(date)) throw new ApiError('validation');
  const db = getPool();
  const now = await getNow();
  const day = date || bangkokDate(now);

  const rows = await db.query<{
    id: string;
    user_id: string | null;
    guest_name: string | null;
    guest_phone: string | null;
    full_name: string | null;
    phone: string | null;
  }>(
    `SELECT b.id, b.user_id, b.guest_name, b.guest_phone, u.full_name, u.phone
       FROM bookings b
       LEFT JOIN users u ON u.id = b.user_id
      WHERE b.status <> 'CANCELLED' AND b.start_at >= $1 AND b.start_at < $2
      ORDER BY b.start_at, b.booking_code`,
    [bangkokInstant(day, '00:00'), bangkokInstant(addDays(day, 1), '00:00')],
  );

  const bookings: AdminBooking[] = [];
  for (const row of rows.rows) {
    const detail = await getBookingDetail(db, row.id, now);
    if (!detail) continue;
    const isGuest = row.user_id === null;
    bookings.push({
      ...detail,
      customerName: (isGuest ? row.guest_name : row.full_name) ?? '',
      customerPhone: (isGuest ? row.guest_phone : row.phone) ?? '',
      isGuest,
    });
  }

  const therapists = await db.query<{
    id: TherapistId;
    name_th: string;
    name_en: string;
    name_zh: string;
    photo_path: string;
  }>(`SELECT id, name_th, name_en, name_zh, photo_path FROM therapists ORDER BY id`);

  return {
    date: day,
    bookings,
    therapists: therapists.rows.map((t) => ({
      id: t.id,
      name: { th: t.name_th, en: t.name_en, zh: t.name_zh },
      photoPath: t.photo_path,
    })),
  };
}
