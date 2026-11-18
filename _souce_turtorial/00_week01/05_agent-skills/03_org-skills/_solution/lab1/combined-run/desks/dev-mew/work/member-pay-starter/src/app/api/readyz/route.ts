import { NextResponse } from "next/server";
import { getEnv } from "@/config/env";
import { getContainer } from "@/lib/container";
import { getStorageMode } from "@/lib/db";
import { respondOk } from "@/lib/http";

export const dynamic = "force-dynamic";

/** พร้อมรับงานเมื่อ env ครบและประกอบ service ได้ */
export function GET() {
  try {
    getEnv();
    getContainer();
    return respondOk({ status: "ready", storage: getStorageMode() });
  } catch {
    return NextResponse.json({ error: { code: "NOT_READY", message: "ระบบยังไม่พร้อมให้บริการ" } }, { status: 503 });
  }
}
