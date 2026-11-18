import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  AccessTokenInvalidError,
  EmailTakenError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  RefreshTokenReusedError,
} from '../errors';
import type { RefreshTokenRecord, RefreshTokenRepository, UserRecord, UserRepository } from '../repository';
import { ACCESS_TOKEN_TTL_SEC, createAuthService, hashPassword, verifyPassword } from '../service';

function setup(start = new Date('2026-11-03T09:00:00Z')) {
  let current = start;
  const users = new Map<string, UserRecord>();
  const tokens = new Map<string, RefreshTokenRecord>();

  const userRepo: UserRepository = {
    findByEmail: async (email) => [...users.values()].find((u) => u.email === email) ?? null,
    findById: async (id) => users.get(id) ?? null,
    create: async (input) => {
      const user: UserRecord = { id: randomUUID(), role: 'member', ...input };
      users.set(user.id, user);
      return user;
    },
  };
  const tokenRepo: RefreshTokenRepository = {
    create: async (input) => {
      const id = randomUUID();
      tokens.set(id, { id, usedAt: null, revokedAt: null, ...input });
    },
    findByHash: async (hash) => [...tokens.values()].find((t) => t.tokenHash === hash) ?? null,
    markUsed: async (id, at) => {
      const t = tokens.get(id);
      if (!t || t.usedAt || t.revokedAt) return false;
      t.usedAt = at;
      return true;
    },
    revokeFamily: async (familyId, at) => {
      for (const t of tokens.values()) if (t.familyId === familyId && !t.revokedAt) t.revokedAt = at;
    },
  };

  const service = createAuthService({
    users: userRepo,
    refreshTokens: tokenRepo,
    accessSecret: 'test-access-secret-at-least-32-characters!!',
    now: () => current,
  });
  return {
    service,
    tokens,
    advance: (sec: number) => {
      current = new Date(current.getTime() + sec * 1000);
    },
  };
}

const CREDS = { email: 'member@example.com', password: 'correct-horse-battery' };

describe('auth service', () => {
  it('register ซ้ำอีเมลเดิมไม่ได้', async () => {
    const { service } = setup();
    await service.register(CREDS);
    await expect(service.register(CREDS)).rejects.toBeInstanceOf(EmailTakenError);
  });

  it('login รหัสผิด → InvalidCredentialsError', async () => {
    const { service } = setup();
    await service.register(CREDS);
    await expect(service.login({ ...CREDS, password: 'wrong-password' })).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(service.login({ ...CREDS, email: 'nobody@example.com' })).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('access token อายุ 15 นาทีพอดี (coding-rules ข้อ 9)', async () => {
    const { service, advance } = setup();
    await service.register(CREDS);
    const tokens = await service.login(CREDS);
    expect(ACCESS_TOKEN_TTL_SEC).toBe(900);

    advance(899);
    await expect(service.verifyAccessToken(tokens.accessToken)).resolves.toMatchObject({ role: 'member' });
    advance(2);
    await expect(service.verifyAccessToken(tokens.accessToken)).rejects.toBeInstanceOf(AccessTokenInvalidError);
  });

  it('refresh หมุน token ทุกครั้ง และได้ access ใหม่ที่ใช้ได้', async () => {
    const { service, advance } = setup();
    await service.register(CREDS);
    const first = await service.login(CREDS);
    advance(14 * 60);
    const second = await service.refresh(first.refreshToken);

    expect(second.refreshToken).not.toBe(first.refreshToken);
    advance(10 * 60);
    await expect(service.verifyAccessToken(second.accessToken)).resolves.toMatchObject({ userId: second.userId });
  });

  it('ใช้ refresh token เก่าซ้ำ → revoke ทั้งตระกูล (reuse detection)', async () => {
    const { service } = setup();
    await service.register(CREDS);
    const first = await service.login(CREDS);
    const second = await service.refresh(first.refreshToken);

    await expect(service.refresh(first.refreshToken)).rejects.toBeInstanceOf(RefreshTokenReusedError);
    // ตัวใหม่ในตระกูลเดียวกันต้องใช้ไม่ได้ด้วย
    await expect(service.refresh(second.refreshToken)).rejects.toBeInstanceOf(RefreshTokenReusedError);
  });

  it('refresh token หมดอายุ / ไม่รู้จัก → InvalidRefreshTokenError', async () => {
    const { service, advance } = setup();
    await service.register(CREDS);
    const tokens = await service.login(CREDS);
    await expect(service.refresh('unknown-token')).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    advance(31 * 24 * 60 * 60);
    await expect(service.refresh(tokens.refreshToken)).rejects.toBeInstanceOf(InvalidRefreshTokenError);
  });

  it('logout แล้ว refresh ไม่ได้', async () => {
    const { service } = setup();
    await service.register(CREDS);
    const tokens = await service.login(CREDS);
    await service.logout(tokens.refreshToken);
    await expect(service.refresh(tokens.refreshToken)).rejects.toBeInstanceOf(RefreshTokenReusedError);
  });

  it('รหัสผ่านเก็บเป็น hash ตรวจย้อนได้', async () => {
    const hash = await hashPassword('s3cret-password');
    expect(hash).not.toContain('s3cret');
    expect(await verifyPassword('s3cret-password', hash)).toBe(true);
    expect(await verifyPassword('other', hash)).toBe(false);
    expect(await verifyPassword('x', 'md5$bad')).toBe(false);
  });
});
