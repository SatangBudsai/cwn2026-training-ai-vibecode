import { describe, expect, it } from "vitest";
import { createAuditService, createInMemoryAuditRepository } from "@/modules/audit";
import { ValidationFailedError } from "@/lib/app-error";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  createAuthService,
  createInMemoryAuthRepository,
  EmailTakenError,
  InvalidCredentialsError,
  InvalidTokenError,
  RefreshTokenReusedError,
} from "../index";

const ACCESS_SECRET = "a".repeat(32);
const REFRESH_SECRET = "r".repeat(32);
const PASSWORD = "correct-horse-battery";

function setup(options: { accessTtlSeconds?: number } = {}) {
  let nowMs = Date.parse("2026-11-03T09:00:00Z");
  const auditRepo = createInMemoryAuditRepository();
  const audit = createAuditService({ repo: auditRepo });
  const auth = createAuthService({
    repo: createInMemoryAuthRepository(),
    accessSecret: ACCESS_SECRET,
    refreshSecret: REFRESH_SECRET,
    clock: () => new Date(nowMs),
    audit,
    ...options,
  });
  return {
    auth,
    audit,
    advanceSeconds: (seconds: number) => {
      nowMs += seconds * 1000;
    },
  };
}

describe("auth service: register + login", () => {
  it("registers a member with a hashed password and normalised email", async () => {
    const { auth } = setup();
    const user = await auth.registerUser({ email: "Mew@Example.com", password: PASSWORD });
    expect(user).toMatchObject({ email: "mew@example.com", role: "member" });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("rejects duplicate emails and weak input", async () => {
    const { auth } = setup();
    await auth.registerUser({ email: "a@example.com", password: PASSWORD });
    await expect(auth.registerUser({ email: "A@example.com", password: PASSWORD })).rejects.toBeInstanceOf(EmailTakenError);
    await expect(auth.registerUser({ email: "not-an-email", password: PASSWORD })).rejects.toBeInstanceOf(ValidationFailedError);
    await expect(auth.registerUser({ email: "b@example.com", password: "short" })).rejects.toBeInstanceOf(ValidationFailedError);
  });

  it("rejects wrong password and unknown user with the same error", async () => {
    const { auth } = setup();
    await auth.registerUser({ email: "a@example.com", password: PASSWORD });
    await expect(auth.loginUser({ email: "a@example.com", password: "wrong-password" })).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(auth.loginUser({ email: "x@example.com", password: PASSWORD })).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(auth.loginUser({ email: "bad", password: PASSWORD })).rejects.toBeInstanceOf(ValidationFailedError);
  });

  it("issues a 15-minute access token (coding rule 9)", async () => {
    const { auth, advanceSeconds } = setup();
    await auth.registerUser({ email: "a@example.com", password: PASSWORD });
    const { tokens, user } = await auth.loginUser({ email: "a@example.com", password: PASSWORD });
    expect(ACCESS_TOKEN_TTL_SECONDS).toBe(900);
    expect(auth.verifyAccess(tokens.accessToken)).toMatchObject({ sub: user.id, role: "member" });
    advanceSeconds(899);
    expect(() => auth.verifyAccess(tokens.accessToken)).not.toThrow();
    advanceSeconds(1);
    expect(() => auth.verifyAccess(tokens.accessToken)).toThrow(InvalidTokenError);
  });

  it("rejects tampered or malformed access tokens", async () => {
    const { auth } = setup();
    await auth.registerUser({ email: "a@example.com", password: PASSWORD });
    const { tokens } = await auth.loginUser({ email: "a@example.com", password: PASSWORD });
    const [header, , signature] = tokens.accessToken.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "x", role: "admin", iat: 0, exp: 9999999999 })).toString("base64url");
    expect(() => auth.verifyAccess([header, forged, signature].join("."))).toThrow(InvalidTokenError);
    expect(() => auth.verifyAccess("not.a")).toThrow(InvalidTokenError);
    expect(() => auth.verifyAccess(["e30", "bm90LWpzb24", "sig"].join("."))).toThrow(InvalidTokenError);
  });
});

describe("auth service: refresh rotation + reuse detection", () => {
  async function loggedIn() {
    const ctx = setup();
    await ctx.auth.registerUser({ email: "a@example.com", password: PASSWORD });
    const { tokens, user } = await ctx.auth.loginUser({ email: "a@example.com", password: PASSWORD });
    return { ...ctx, tokens, user };
  }

  it("rotates the refresh token on every use", async () => {
    const { auth, tokens } = await loggedIn();
    const next = await auth.refreshSession(tokens.refreshToken);
    expect(next.refreshToken).not.toBe(tokens.refreshToken);
    const third = await auth.refreshSession(next.refreshToken);
    expect(third.refreshToken).not.toBe(next.refreshToken);
  });

  it("revokes the whole family when an old refresh token is reused", async () => {
    const { auth, tokens } = await loggedIn();
    const next = await auth.refreshSession(tokens.refreshToken);
    await expect(auth.refreshSession(tokens.refreshToken)).rejects.toBeInstanceOf(RefreshTokenReusedError);
    // token ใหม่ในตระกูลเดียวกันต้องใช้ไม่ได้ด้วย
    await expect(auth.refreshSession(next.refreshToken)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("rejects unknown, malformed and expired refresh tokens", async () => {
    const { auth, tokens, advanceSeconds } = await loggedIn();
    await expect(auth.refreshSession("x".repeat(43))).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(auth.refreshSession("short")).rejects.toBeInstanceOf(InvalidTokenError);
    advanceSeconds(30 * 24 * 60 * 60);
    await expect(auth.refreshSession(tokens.refreshToken)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("logout revokes the family; logout with junk is a no-op", async () => {
    const { auth, tokens } = await loggedIn();
    await auth.logoutUser("short");
    await auth.logoutUser("y".repeat(43));
    await auth.logoutUser(tokens.refreshToken);
    await expect(auth.refreshSession(tokens.refreshToken)).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("logging in on another device does not kill the first device's session", async () => {
    const { auth, tokens } = await loggedIn();
    const second = await auth.loginUser({ email: "a@example.com", password: PASSWORD });
    await auth.logoutUser(second.tokens.refreshToken);
    await expect(auth.refreshSession(tokens.refreshToken)).resolves.toHaveProperty("accessToken");
  });
});
