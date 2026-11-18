// public interface ของโมดูล auth — ที่อื่น import จากไฟล์นี้เท่านั้น (coding-rules ข้อ 1)
import { getEnv } from '@/config/env';
import { ForbiddenError, UnauthorizedError } from '@/lib/app-error';
import { prisma } from '@/lib/db';
import { createPrismaRefreshTokenRepository, createPrismaUserRepository } from './repository';
import type { Role } from './schema';
import { createAuthService, type AccessClaims, type AuthService } from './service';

export * from './errors';
export { loginInputSchema, registerInputSchema, type Role } from './schema';
export { ACCESS_TOKEN_TTL_SEC, REFRESH_TOKEN_TTL_SEC, type AccessClaims, type TokenPair } from './service';

export const REFRESH_COOKIE = 'refresh_token';

let service: AuthService | undefined;

export function getAuthService(): AuthService {
  const env = getEnv();
  service ??= createAuthService({
    users: createPrismaUserRepository(prisma),
    refreshTokens: createPrismaRefreshTokenRepository(prisma),
    accessSecret: env.JWT_ACCESS_SECRET,
    accessTtlSec: env.ACCESS_TOKEN_TTL_SEC,
  });
  return service;
}

/** coding-rules ข้อ 9: httpOnly; Secure; SameSite=Lax — จำกัด path ให้ส่งเฉพาะ /api/auth */
export function refreshCookie(token: string, expiresAt: Date): string {
  return `${REFRESH_COOKIE}=${token}; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Expires=${expiresAt.toUTCString()}`;
}

export function clearRefreshCookie(): string {
  return `${REFRESH_COOKIE}=; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readRefreshCookie(req: Request): string | null {
  const cookie = req.headers.get('cookie') ?? '';
  const match = cookie.split(/;\s*/).find((part) => part.startsWith(`${REFRESH_COOKIE}=`));
  const value = match?.slice(REFRESH_COOKIE.length + 1);
  return value ? value : null;
}

/** ตรวจ access token + role ก่อนเรียก service (coding-rules ข้อ 10) */
export async function requireUser(req: Request, roles: readonly Role[] = ['member', 'staff', 'admin']): Promise<AccessClaims> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) throw new UnauthorizedError();
  const claims = await getAuthService().verifyAccessToken(header.slice('Bearer '.length));
  if (!roles.includes(claims.role)) throw new ForbiddenError();
  return claims;
}
