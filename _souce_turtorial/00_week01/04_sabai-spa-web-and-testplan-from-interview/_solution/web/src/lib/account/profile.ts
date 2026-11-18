// แปลงแถว users และการจอง เป็นรูปแบบของ API · ฟังก์ชันล้วน
import { numericToBaht } from '@/lib/money';
import { nextTier, tierFromSpend } from '@/lib/pricing/rules';
import type { BookingDetail, HistoryItem, MeResponse, Role } from '@/types';

export interface UserRow {
  id: string;
  email: string;
  role: Role;
  full_name: string;
  phone: string;
  birth_date: string | null;
  lifetime_spend: string;
  points_balance: number;
}

/** ไม่รวม password_hash · ใช้ SELECT/RETURNING ที่ส่งผลลัพธ์ออก API */
export const USER_COLUMNS = 'id, email, role, full_name, phone, birth_date, lifetime_spend, points_balance';

/** ระดับคำนวณจากยอดสะสมทุกครั้ง · OWNER ไม่มีระดับ */
export function toMeResponse(row: UserRow): MeResponse {
  const lifetimeSpend = numericToBaht(row.lifetime_spend);
  const isOwner = row.role === 'OWNER';
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    birthDate: row.birth_date,
    role: row.role,
    lifetimeSpend,
    pointsBalance: row.points_balance,
    tier: isOwner ? null : tierFromSpend(lifetimeSpend),
    nextTier: isOwner ? null : nextTier(lifetimeSpend),
  };
}

function toHistoryItem(booking: BookingDetail): HistoryItem {
  return {
    bookingId: booking.id,
    bookingCode: booking.bookingCode,
    serviceId: booking.serviceId,
    serviceName: booking.serviceName,
    date: booking.date,
    time: booking.time,
    endTime: booking.endTime,
    therapists: booking.therapists,
    usedCourse: booking.coursePurchaseId !== null,
    payAtShop: booking.lines.payAtShop,
    pointsEarned: booking.pointsEarned,
  };
}

/** listBookingsForUser เรียงจากใกล้ไปไกล ประวัติต้องกลับเป็นวันนัดล่าสุดก่อน (FR-45) */
export function toHistoryItems(bookings: BookingDetail[]): HistoryItem[] {
  return bookings
    .map(toHistoryItem)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.time.localeCompare(a.time) ||
        b.bookingCode.localeCompare(a.bookingCode),
    );
}
