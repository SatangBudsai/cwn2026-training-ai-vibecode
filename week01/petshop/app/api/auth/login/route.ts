import { NextResponse } from "next/server";
import { attachSession } from "@/lib/auth";
import { findUserByEmail, toPublicUser, verifyPassword } from "@/lib/store";
import { MSG } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // empty body -> 401 below
  }
  const email = String(body.email ?? "");
  const password = String(body.password ?? "");
  const user = email ? findUserByEmail(email) : undefined;
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: MSG.login }, { status: 401 });
  }
  const res = NextResponse.json({ user: toPublicUser(user) });
  return attachSession(res, user.id);
}
