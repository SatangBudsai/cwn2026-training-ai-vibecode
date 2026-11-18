// session เป็น cookie HttpOnly ที่เซ็น HMAC · ไม่เก็บอะไรนอกจาก uid และ role
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { ApiError } from '@/lib/errors';
import type { Role } from '@/types';

export const SESSION_COOKIE = 'sabai_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface Session {
  userId: string;
  role: Role;
}

function secret(): string {
  return process.env.SESSION_SECRET || 'sabai-local-dev-session-secret-change-me';
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function encodeSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Session;
    if (typeof data.userId !== 'string' || (data.role !== 'CUSTOMER' && data.role !== 'OWNER')) return null;
    return { userId: data.userId, role: data.role };
  } catch {
    return null;
  }
}

/** อ่าน session จาก cookie (ใช้ได้ทั้ง route handler และ server component) */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}

/** ตั้ง cookie หลังสมัครหรือเข้าสู่ระบบ (เรียกใน route handler เท่านั้น) */
export async function setSession(session: Session): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** ต้องเข้าสู่ระบบ ไม่งั้น 401 */
export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new ApiError('unauthorized');
  return session;
}

/** ต้องเป็นบัญชีร้าน: ไม่เข้าสู่ระบบ 401 · ลูกค้า 403 (NFR-12) */
export async function requireOwner(): Promise<Session> {
  const session = await requireUser();
  if (session.role !== 'OWNER') throw new ApiError('forbidden');
  return session;
}
