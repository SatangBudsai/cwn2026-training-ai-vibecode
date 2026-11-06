import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { createSession, toPublicUser, userForSession, type PublicUser, type User } from "./store";

export const SESSION_COOKIE = "pp_session";

export async function currentUser(): Promise<User | undefined> {
  const jar = await cookies();
  return userForSession(jar.get(SESSION_COOKIE)?.value);
}

export async function currentPublicUser(): Promise<PublicUser | null> {
  const u = await currentUser();
  return u ? toPublicUser(u) : null;
}

export function attachSession(res: NextResponse, userId: number): NextResponse {
  const token = createSession(userId);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
