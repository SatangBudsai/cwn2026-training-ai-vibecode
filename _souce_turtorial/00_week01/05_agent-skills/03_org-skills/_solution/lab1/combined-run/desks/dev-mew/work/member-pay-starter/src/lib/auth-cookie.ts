import type { NextResponse } from "next/server";
import { getEnv } from "@/config/env";
import { REFRESH_TOKEN_COOKIE_NAME, type TokenPair } from "@/modules/auth";

/** refresh token อยู่ใน cookie httpOnly; Secure; SameSite=Lax (กติกาข้อ 9) */
export function setRefreshCookie(response: NextResponse, tokens: TokenPair): void {
  response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, {
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    expires: tokens.refreshTokenExpiresAt,
  });
}

export function clearRefreshCookie(response: NextResponse): void {
  response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/api/auth", maxAge: 0 });
}

export function readRefreshCookie(request: Request): string {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(REFRESH_TOKEN_COOKIE_NAME + "="));
  return match ? decodeURIComponent(match.slice(REFRESH_TOKEN_COOKIE_NAME.length + 1)) : "";
}

export function toAccessPayload(tokens: TokenPair) {
  return { accessToken: tokens.accessToken, accessTokenExpiresAt: tokens.accessTokenExpiresAt.toISOString() };
}
