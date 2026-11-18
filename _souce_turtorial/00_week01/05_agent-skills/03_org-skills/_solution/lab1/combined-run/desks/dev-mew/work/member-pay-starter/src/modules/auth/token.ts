import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { InvalidTokenError } from "./errors";
import { AccessTokenClaimsSchema, type AccessTokenClaims, type UserRole } from "./schema";

const PASSWORD_KEY_LENGTH = 64;

function scryptAsync(password: string, salt: Buffer, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, PASSWORD_KEY_LENGTH);
  return ["scrypt", salt.toString("base64url"), key.toString("base64url")].join(":");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltText, keyText] = stored.split(":");
  if (scheme !== "scrypt" || !saltText || !keyText) return false;
  const expected = Buffer.from(keyText, "base64url");
  const actual = await scryptAsync(password, Buffer.from(saltText, "base64url"), expected.length);
  return timingSafeEqual(expected, actual);
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

/** JWT HS256 แบบเล็ก ใช้ node:crypto ล้วน */
export function signAccessToken(
  subject: { userId: string; role: UserRole },
  secret: string,
  nowSeconds: number,
  ttlSeconds: number,
): string {
  const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const payload = base64UrlJson({ sub: subject.userId, role: subject.role, iat: nowSeconds, exp: nowSeconds + ttlSeconds });
  return [header, payload, sign(header + "." + payload, secret)].join(".");
}

export function verifyAccessToken(token: string, secret: string, nowSeconds: number): AccessTokenClaims {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) throw new InvalidTokenError();
  const expected = Buffer.from(sign(header + "." + payload, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new InvalidTokenError();
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new InvalidTokenError();
  }
  const claims = AccessTokenClaimsSchema.safeParse(decoded);
  if (!claims.success || claims.data.exp <= nowSeconds) throw new InvalidTokenError();
  return claims.data;
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

/** เก็บแค่ hash ของ refresh token ในฐานข้อมูล */
export function hashRefreshToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}
