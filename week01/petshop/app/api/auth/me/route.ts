import { NextResponse } from "next/server";
import { currentPublicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ user: await currentPublicUser() });
}
