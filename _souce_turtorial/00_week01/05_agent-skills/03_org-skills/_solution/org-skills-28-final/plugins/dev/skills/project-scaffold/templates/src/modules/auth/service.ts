import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { jwtVerify, SignJWT } from 'jose';
import {
  AccessTokenInvalidError,
  EmailTakenError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  RefreshTokenReusedError,
} from './errors';
import type { RefreshTokenRepository, UserRecord, UserRepository } from './repository';
import { ROLES, type Role } from './schema';

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

// coding-rules ข้อ 9 (บทเรียนบั๊ก ShopDee 2025): access 15 นาที, refresh หมุนทุกครั้ง + reuse detection
export const ACCESS_TOKEN_TTL_SEC = 15 * 60;
export const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60;

export interface AuthServiceDeps {
  users: UserRepository;
  refreshTokens: RefreshTokenRepository;
  accessSecret: string;
  /** ปรับได้เฉพาะ test (E2E ตั้ง 5 วินาที) */
  accessTtlSec?: number;
  now?: () => Date;
}

export interface TokenPair {
  accessToken: string;
  accessExpiresAt: Date;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface AccessClaims {
  userId: string;
  role: Role;
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltB64, hashB64] = stored.split('$');
  if (algo !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const derived = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(derived, expected);
}

const toSeconds = (date: Date) => Math.floor(date.getTime() / 1000);

export function createAuthService(deps: AuthServiceDeps) {
  const now = deps.now ?? (() => new Date());
  const accessTtlSec = deps.accessTtlSec ?? ACCESS_TOKEN_TTL_SEC;
  const accessKey = new TextEncoder().encode(deps.accessSecret);

  async function issueTokens(user: UserRecord, familyId: string): Promise<TokenPair> {
    const issuedAt = now();
    const accessExpiresAt = new Date(issuedAt.getTime() + accessTtlSec * 1000);
    const accessToken = await new SignJWT({ role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt(toSeconds(issuedAt))
      .setExpirationTime(toSeconds(accessExpiresAt))
      .sign(accessKey);

    const refreshToken = randomBytes(32).toString('base64url');
    const refreshExpiresAt = new Date(issuedAt.getTime() + REFRESH_TOKEN_TTL_SEC * 1000);
    await deps.refreshTokens.create({
      userId: user.id,
      familyId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshExpiresAt,
    });
    return { accessToken, accessExpiresAt, refreshToken, refreshExpiresAt };
  }

  return {
    async register(input: { email: string; password: string }): Promise<{ userId: string }> {
      if (await deps.users.findByEmail(input.email)) throw new EmailTakenError();
      const user = await deps.users.create({
        email: input.email,
        passwordHash: await hashPassword(input.password),
      });
      return { userId: user.id };
    },

    async login(input: { email: string; password: string }): Promise<TokenPair & { userId: string }> {
      const user = await deps.users.findByEmail(input.email);
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new InvalidCredentialsError();
      }
      // login ใหม่ = ตระกูล refresh token ใหม่
      return { userId: user.id, ...(await issueTokens(user, randomUUID())) };
    },

    /** หมุน refresh token: ตัวเก่าใช้ไม่ได้อีก ใช้ซ้ำ = revoke ทั้ง family */
    async refresh(refreshToken: string): Promise<TokenPair & { userId: string }> {
      const record = await deps.refreshTokens.findByHash(hashRefreshToken(refreshToken));
      if (!record) throw new InvalidRefreshTokenError();

      const at = now();
      if (record.usedAt || record.revokedAt) {
        await deps.refreshTokens.revokeFamily(record.familyId, at);
        throw new RefreshTokenReusedError();
      }
      if (record.expiresAt.getTime() <= at.getTime()) throw new InvalidRefreshTokenError();

      // กันสองคำขอใช้ token เดียวกันพร้อมกัน: ตัวที่สองถือว่าเป็น reuse
      if (!(await deps.refreshTokens.markUsed(record.id, at))) {
        await deps.refreshTokens.revokeFamily(record.familyId, at);
        throw new RefreshTokenReusedError();
      }

      const user = await deps.users.findById(record.userId);
      if (!user) throw new InvalidRefreshTokenError();
      return { userId: user.id, ...(await issueTokens(user, record.familyId)) };
    },

    async logout(refreshToken: string): Promise<void> {
      const record = await deps.refreshTokens.findByHash(hashRefreshToken(refreshToken));
      if (record) await deps.refreshTokens.revokeFamily(record.familyId, now());
    },

    async verifyAccessToken(accessToken: string): Promise<AccessClaims> {
      try {
        const { payload } = await jwtVerify(accessToken, accessKey, { currentDate: now() });
        const role = payload.role;
        if (!payload.sub || typeof role !== 'string' || !(ROLES as readonly string[]).includes(role)) {
          throw new AccessTokenInvalidError();
        }
        return { userId: payload.sub, role: role as Role };
      } catch (err: unknown) {
        if (err instanceof AccessTokenInvalidError) throw err;
        // jose โยน error ตอนหมดอายุ/ลายเซ็นผิด → แปลงเป็น error ที่มี type
        throw new AccessTokenInvalidError();
      }
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
