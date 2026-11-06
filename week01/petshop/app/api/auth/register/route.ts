import { NextResponse } from "next/server";
import { attachSession } from "@/lib/auth";
import { createUser, findUserByEmail, toPublicUser, type UserPet } from "@/lib/store";
import { MSG, validateRegister } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // empty body -> validation errors below
  }
  const input = {
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
    confirm: String(body.confirm ?? body.password ?? ""),
    terms: body.terms === true || body.terms === "true" || body.terms === "on",
  };
  const errors = validateRegister(input);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }
  if (findUserByEmail(input.email)) {
    return NextResponse.json({ errors: { email: MSG.duplicate } }, { status: 409 });
  }
  const pet: UserPet = body.pet === "dog" || body.pet === "both" ? body.pet : "cat";
  const user = createUser({ name: input.name, email: input.email, password: input.password, pet });
  const res = NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
  return attachSession(res, user.id);
}
