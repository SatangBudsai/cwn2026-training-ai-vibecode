// ฝั่ง browser: เก็บ access token ในหน่วยความจำเท่านั้น (refresh token อยู่ใน httpOnly cookie)
// coding-rules ข้อ 9: refresh ก่อนหมดอายุ 60 วินาที และก่อนพาผู้ใช้ไปหน้าชำระเงินเสมอ

import { UnauthorizedError } from '@/lib/app-error';

export const REFRESH_LEEWAY_MS = 60_000;

interface Session {
  accessToken: string;
  expiresAt: number;
  /** refresh ล่วงหน้าเท่าไร: 60 วิ แต่ไม่เกินครึ่งอายุ token (กัน refresh วนถี่เมื่อ TTL สั้น เช่น E2E 5 วิ) */
  leadMs: number;
}

let session: Session | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let inflight: Promise<boolean> | null = null;

function schedule(): void {
  clearTimeout(timer);
  if (!session) return;
  const delay = Math.max(0, session.expiresAt - Date.now() - session.leadMs);
  timer = setTimeout(() => void refreshNow(), delay);
}

export function setSession(accessToken: string, accessExpiresAt: string): void {
  const expiresAt = new Date(accessExpiresAt).getTime();
  const leadMs = Math.min(REFRESH_LEEWAY_MS, Math.max(0, expiresAt - Date.now()) / 2);
  session = { accessToken, expiresAt, leadMs };
  schedule();
}

export function clearSession(): void {
  session = null;
  clearTimeout(timer);
}

export function hasSession(): boolean {
  return session !== null;
}

/** หลายแท็บ refresh พร้อมกันจะชน reuse detection → ใช้ Web Locks ให้ทำทีละแท็บ */
async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request('auth-refresh', fn);
  }
  return fn();
}

/** หมุน token ทันที (cookie refresh ถูกส่งไปอัตโนมัติ) · ใช้ตอนเปิดหน้าใหม่เพื่อกู้ session ด้วย */
export function refreshNow(): Promise<boolean> {
  inflight ??= withLock(async () => {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' });
    if (!res.ok) {
      clearSession();
      return false;
    }
    const body = (await res.json()) as { data: { accessToken: string; accessExpiresAt: string } };
    setSession(body.data.accessToken, body.data.accessExpiresAt);
    return true;
  }).finally(() => {
    inflight = null;
  });
  return inflight;
}

export async function getAccessToken(): Promise<string | null> {
  if (!session) return null;
  if (session.expiresAt - Date.now() < session.leadMs) await refreshNow();
  return session?.accessToken ?? null;
}

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers, credentials: 'same-origin' });
}

/** ก่อนออกไป gateway: refresh ทุกครั้ง (ผู้ใช้อาจอยู่หน้าธนาคารนาน) แล้วค่อย redirect */
export async function goToGateway(redirectUrl: string): Promise<void> {
  // หยุดตัวตั้งเวลาก่อน: ถ้า refresh ถูกตัดกลางทางตอนเปลี่ยนหน้า server หมุน token ไปแล้วแต่ browser
  // ไม่ได้ cookie ใหม่ → ครั้งหน้าใช้ token เก่า = reuse → โดน revoke ทั้งตระกูล (เจอจาก E2E)
  clearTimeout(timer);
  if (!(await refreshNow())) throw new UnauthorizedError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  clearTimeout(timer);
  window.location.assign(redirectUrl);
}
