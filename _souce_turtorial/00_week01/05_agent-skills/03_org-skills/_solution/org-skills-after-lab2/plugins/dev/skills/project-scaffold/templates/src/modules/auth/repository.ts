import type { PrismaClient } from '@prisma/client';
import type { Role } from './schema';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(input: { email: string; passwordHash: string; role?: Role }): Promise<UserRecord>;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
}

export interface RefreshTokenRepository {
  create(input: { userId: string; familyId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  /** ตั้ง used_at แบบมีเงื่อนไข (ยังไม่ถูกใช้/ยังไม่ถูก revoke) → false = มีคนใช้ไปก่อนแล้ว */
  markUsed(id: string, at: Date): Promise<boolean>;
  revokeFamily(familyId: string, at: Date): Promise<void>;
}

function toUser(row: { id: string; email: string; passwordHash: string; role: string }): UserRecord {
  return { ...row, role: row.role as Role };
}

export function createPrismaUserRepository(db: PrismaClient): UserRepository {
  return {
    async findByEmail(email) {
      const row = await db.user.findUnique({ where: { email } });
      return row ? toUser(row) : null;
    },
    async findById(id) {
      const row = await db.user.findUnique({ where: { id } });
      return row ? toUser(row) : null;
    },
    async create(input) {
      return toUser(await db.user.create({ data: input }));
    },
  };
}

export function createPrismaRefreshTokenRepository(db: PrismaClient): RefreshTokenRepository {
  return {
    async create(input) {
      await db.refreshToken.create({ data: input });
    },
    findByHash(tokenHash) {
      return db.refreshToken.findUnique({ where: { tokenHash } });
    },
    async markUsed(id, at) {
      const result = await db.refreshToken.updateMany({
        where: { id, usedAt: null, revokedAt: null },
        data: { usedAt: at },
      });
      return result.count === 1;
    },
    async revokeFamily(familyId, at) {
      await db.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: at } });
    },
  };
}
