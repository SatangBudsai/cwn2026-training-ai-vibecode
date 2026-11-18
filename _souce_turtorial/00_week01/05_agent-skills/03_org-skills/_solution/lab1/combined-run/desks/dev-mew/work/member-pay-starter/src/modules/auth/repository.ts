import type { UserRole } from "./schema";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  insertUser(user: UserRecord): Promise<void>;
  insertRefreshToken(token: RefreshTokenRecord): Promise<void>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  /** compare-and-set: คืน true เฉพาะเมื่อ token ยังไม่ถูกใช้ (กันสองแท็บ refresh พร้อมกัน) */
  markRefreshTokenUsed(id: string, usedAt: Date): Promise<boolean>;
  revokeRefreshTokenFamily(familyId: string, revokedAt: Date): Promise<void>;
}

export function createInMemoryAuthRepository(): AuthRepository {
  const users = new Map<string, UserRecord>();
  const tokens = new Map<string, RefreshTokenRecord>();
  return {
    async findUserByEmail(email) {
      return [...users.values()].find((u) => u.email === email) ?? null;
    },
    async findUserById(id) {
      return users.get(id) ?? null;
    },
    async insertUser(user) {
      users.set(user.id, user);
    },
    async insertRefreshToken(token) {
      tokens.set(token.id, token);
    },
    async findRefreshTokenByHash(tokenHash) {
      return [...tokens.values()].find((t) => t.tokenHash === tokenHash) ?? null;
    },
    async markRefreshTokenUsed(id, usedAt) {
      const token = tokens.get(id);
      if (!token || token.usedAt) return false;
      token.usedAt = usedAt;
      return true;
    },
    async revokeRefreshTokenFamily(familyId, revokedAt) {
      for (const token of tokens.values()) {
        if (token.familyId === familyId && !token.revokedAt) token.revokedAt = revokedAt;
      }
    },
  };
}
