import { ValidationFailedError } from "@/lib/app-error";
import { systemClock, type Clock } from "@/lib/clock";
import { createId } from "@/lib/ids";
import type { AuditRecorder } from "@/modules/audit";
import { EmailTakenError, InvalidCredentialsError, InvalidTokenError, RefreshTokenReusedError } from "./errors";
import type { AuthRepository, UserRecord } from "./repository";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  LoginInputSchema,
  REFRESH_TOKEN_TTL_SECONDS,
  RefreshTokenSchema,
  RegisterInputSchema,
  type AccessTokenClaims,
  type LoginInput,
  type RegisterInput,
  type TokenPair,
  type UserRole,
} from "./schema";
import {
  generateRefreshToken,
  hashPassword,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
} from "./token";

export interface AuthServiceDeps {
  repo: AuthRepository;
  accessSecret: string;
  refreshSecret: string;
  accessTtlSeconds?: number;
  refreshTtlSeconds?: number;
  clock?: Clock;
  audit?: AuditRecorder;
}

export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthService {
  registerUser(input: RegisterInput): Promise<PublicUser>;
  loginUser(input: LoginInput): Promise<{ user: PublicUser; tokens: TokenPair }>;
  refreshSession(refreshToken: string): Promise<TokenPair>;
  logoutUser(refreshToken: string): Promise<void>;
  verifyAccess(accessToken: string): AccessTokenClaims;
}

function toPublicUser(user: UserRecord): PublicUser {
  return { id: user.id, email: user.email, role: user.role };
}

export function createAuthService(deps: AuthServiceDeps): AuthService {
  const {
    repo,
    accessSecret,
    refreshSecret,
    accessTtlSeconds = ACCESS_TOKEN_TTL_SECONDS,
    refreshTtlSeconds = REFRESH_TOKEN_TTL_SECONDS,
    clock = systemClock,
    audit,
  } = deps;

  async function issueTokenPair(user: Pick<UserRecord, "id" | "role">, familyId: string): Promise<TokenPair> {
    const now = clock();
    const nowSeconds = Math.floor(now.getTime() / 1000);
    const refreshToken = generateRefreshToken();
    const refreshTokenExpiresAt = new Date(now.getTime() + refreshTtlSeconds * 1000);
    await repo.insertRefreshToken({
      id: createId(),
      userId: user.id,
      familyId,
      tokenHash: hashRefreshToken(refreshToken, refreshSecret),
      expiresAt: refreshTokenExpiresAt,
      usedAt: null,
      revokedAt: null,
      createdAt: now,
    });
    return {
      accessToken: signAccessToken({ userId: user.id, role: user.role }, accessSecret, nowSeconds, accessTtlSeconds),
      accessTokenExpiresAt: new Date((nowSeconds + accessTtlSeconds) * 1000),
      refreshToken,
      refreshTokenExpiresAt,
    };
  }

  return {
    async registerUser(input) {
      const parsed = RegisterInputSchema.safeParse(input);
      if (!parsed.success) throw new ValidationFailedError(undefined, { cause: parsed.error });
      if (await repo.findUserByEmail(parsed.data.email)) throw new EmailTakenError();
      const user: UserRecord = {
        id: createId(),
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        role: "member",
        createdAt: clock(),
      };
      await repo.insertUser(user);
      await audit?.recordAction({ actorId: user.id, action: "auth.register", targetType: "user", targetId: user.id });
      return toPublicUser(user);
    },

    async loginUser(input) {
      const parsed = LoginInputSchema.safeParse(input);
      if (!parsed.success) throw new ValidationFailedError(undefined, { cause: parsed.error });
      const user = await repo.findUserByEmail(parsed.data.email);
      if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
        throw new InvalidCredentialsError();
      }
      const tokens = await issueTokenPair(user, createId());
      await audit?.recordAction({ actorId: user.id, action: "auth.login", targetType: "user", targetId: user.id });
      return { user: toPublicUser(user), tokens };
    },

    async refreshSession(refreshToken) {
      const parsed = RefreshTokenSchema.safeParse(refreshToken);
      if (!parsed.success) throw new InvalidTokenError();
      const now = clock();
      const stored = await repo.findRefreshTokenByHash(hashRefreshToken(parsed.data, refreshSecret));
      if (!stored || stored.revokedAt || stored.expiresAt <= now) throw new InvalidTokenError();

      // reuse detection: refresh token ที่ถูกใช้ไปแล้วถูกส่งมาอีก = เพิกถอนทั้งตระกูล
      const claimed = stored.usedAt === null && (await repo.markRefreshTokenUsed(stored.id, now));
      if (!claimed) {
        await repo.revokeRefreshTokenFamily(stored.familyId, now);
        await audit?.recordAction({
          actorId: stored.userId,
          action: "auth.refresh_reused",
          targetType: "token_family",
          targetId: stored.familyId,
        });
        throw new RefreshTokenReusedError();
      }

      const user = await repo.findUserById(stored.userId);
      if (!user) throw new InvalidTokenError();
      return issueTokenPair(user, stored.familyId);
    },

    async logoutUser(refreshToken) {
      const parsed = RefreshTokenSchema.safeParse(refreshToken);
      if (!parsed.success) return;
      const stored = await repo.findRefreshTokenByHash(hashRefreshToken(parsed.data, refreshSecret));
      if (!stored) return;
      await repo.revokeRefreshTokenFamily(stored.familyId, clock());
      await audit?.recordAction({ actorId: stored.userId, action: "auth.logout", targetType: "user", targetId: stored.userId });
    },

    verifyAccess(accessToken) {
      return verifyAccessToken(accessToken, accessSecret, Math.floor(clock().getTime() / 1000));
    },
  };
}
