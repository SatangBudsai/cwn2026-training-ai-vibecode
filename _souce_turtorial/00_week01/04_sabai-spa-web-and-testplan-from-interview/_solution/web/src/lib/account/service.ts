// สมัคร เข้าสู่ระบบ และข้อมูลของผู้ใช้ที่เข้าสู่ระบบอยู่
// ทุกฟังก์ชันอ่านผู้ใช้จาก session เท่านั้น ไม่รับรหัสผู้ใช้จาก request (NFR-12)
import { listBookingsForUser } from '@/lib/booking/read';
import { getNow, getToday } from '@/lib/clock';
import { getPool, query } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { clearSession, requireUser, setSession } from '@/lib/session';
import type { BookingDetail, HistoryItem, MeResponse } from '@/types';
import { hashPassword, verifyPassword } from './password';
import { toHistoryItems, toMeResponse, USER_COLUMNS, type UserRow } from './profile';
import { parseLogin, parseRegister } from './validation';

/** สมัครเป็น CUSTOMER เสมอ แล้วเข้าสู่ระบบให้ทันที · ON CONFLICT กันสมัครอีเมลเดียวกันพร้อมกัน */
export async function registerUser(body: unknown): Promise<MeResponse> {
  const input = parseRegister(body, await getToday());
  const passwordHash = await hashPassword(input.password);
  const { rows } = await query<UserRow>(
    `INSERT INTO users (email, password_hash, role, full_name, phone, birth_date)
     VALUES ($1, $2, 'CUSTOMER', $3, $4, $5)
     ON CONFLICT (email) DO NOTHING
     RETURNING ${USER_COLUMNS}`,
    [input.email, passwordHash, input.fullName, input.phone, input.birthDate],
  );
  const user = rows[0];
  if (!user) throw new ApiError('email-taken');
  await setSession({ userId: user.id, role: user.role });
  return toMeResponse(user);
}

export async function loginUser(body: unknown): Promise<MeResponse> {
  const { email, password } = parseLogin(body);
  const { rows } = await query<UserRow & { password_hash: string }>(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [email],
  );
  const user = rows[0];
  if (!user || !(await verifyPassword(user.password_hash, password))) {
    throw new ApiError('invalid-credentials');
  }
  await setSession({ userId: user.id, role: user.role });
  return toMeResponse(user);
}

/** ผู้ใช้จาก session · ไม่เข้าสู่ระบบ หรือผู้ใช้ไม่มีแล้วหลังรีเซ็ต ตอบ 401 และล้าง cookie ค้าง */
export async function requireCurrentUser(): Promise<MeResponse> {
  const { userId } = await requireUser();
  const { rows } = await query<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [userId]);
  const user = rows[0];
  if (!user) {
    await clearSession();
    throw new ApiError('unauthorized');
  }
  return toMeResponse(user);
}

export async function getMyHistory(): Promise<HistoryItem[]> {
  const user = await requireCurrentUser();
  const bookings = await listBookingsForUser(getPool(), user.id, ['COMPLETED'], await getNow());
  return toHistoryItems(bookings);
}

export async function getMyBookings(): Promise<BookingDetail[]> {
  const user = await requireCurrentUser();
  return listBookingsForUser(getPool(), user.id, ['CONFIRMED'], await getNow());
}
