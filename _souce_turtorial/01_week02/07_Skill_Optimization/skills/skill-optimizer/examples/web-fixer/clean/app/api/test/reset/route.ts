import { NextResponse } from "next/server";
import { resetStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Test helper: reset the in-memory store to seed data. Only when ALLOW_TEST_RESET=1. */
export function POST() {
  if (process.env.ALLOW_TEST_RESET !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  resetStore();
  return NextResponse.json({ ok: true });
}
