// ตรวจข้อมูลสมัครและเข้าสู่ระบบ · ฟังก์ชันล้วน ไม่แตะฐานข้อมูล
import { isValidDateString } from '@/lib/date';
import { ApiError } from '@/lib/errors';
import type { LoginRequest, RegisterRequest } from '@/types';

export const PASSWORD_MIN_LENGTH = 8;
// เกินความยาวนี้ไม่ใช่อีเมลจริง และกันดัชนี UNIQUE ของ users.email ล้น
const EMAIL_MAX_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@\0]+@[^\s@.\0]+(\.[^\s@.\0]+)+$/;
const PHONE_PATTERN = /^\d{9,10}$/;

/** ทุกจุดที่เขียนหรือค้น users.email ต้องผ่านตัวนี้ คอลัมน์จึงเป็นตัวเล็กเสมอ */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(normalized: string): boolean {
  return normalized.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(normalized);
}

export function isValidPassword(password: unknown): password is string {
  // นับตามตัวอักษร ไม่ใช่ UTF-16 unit อีโมจิจึงนับเป็น 1 ตัว
  return typeof password === 'string' && [...password].length >= PASSWORD_MIN_LENGTH;
}

/** D-18: ตัวเลขล้วน 9–10 หลัก */
export function isValidPhone(phone: unknown): phone is string {
  return typeof phone === 'string' && PHONE_PATTERN.test(phone);
}

/** วันเกิดต้องเป็นวันที่จริงและอยู่ก่อนวันนี้ของเว็บ (วันนี้เองไม่ผ่าน) */
export function isValidBirthDate(birthDate: unknown, today: string): birthDate is string {
  return isValidDateString(birthDate) && birthDate < today;
}

function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null) throw new ApiError('validation');
  return body as Record<string, unknown>;
}

/**
 * อ่านเฉพาะ 5 ช่องตามสัญญา ช่องอื่นใน body ไม่มีผล (role, ยอดสะสม, รูป ส่งมาก็ไม่ถูกใช้)
 * ตรวจเรียงตามสัญญา: อีเมล → รหัส → ชื่อ → เบอร์ → วันเกิด
 */
export function parseRegister(body: unknown, today: string): RegisterRequest {
  const { email, password, fullName, phone, birthDate } = asObject(body);

  if (typeof email !== 'string') throw new ApiError('email-invalid');
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) throw new ApiError('email-invalid');

  if (!isValidPassword(password)) throw new ApiError('password-too-short');

  const name = typeof fullName === 'string' ? fullName.trim() : '';
  // NUL เก็บใน TEXT ของ PostgreSQL ไม่ได้
  if (!name || name.includes('\0')) throw new ApiError('name-required');

  if (!isValidPhone(phone)) throw new ApiError('phone-invalid');
  if (!isValidBirthDate(birthDate, today)) throw new ApiError('birth-date-invalid');

  return { email: normalizedEmail, password, fullName: name, phone, birthDate };
}

/** ข้อมูลที่ไม่มีทางตรงกับบัญชีใด ตอบเหมือนรหัสผิดทุกกรณี ไม่บอกว่าช่องไหนผิด */
export function parseLogin(body: unknown): LoginRequest {
  const { email, password } = asObject(body);
  if (typeof email !== 'string' || typeof password !== 'string') throw new ApiError('invalid-credentials');
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) throw new ApiError('invalid-credentials');
  return { email: normalizedEmail, password };
}
