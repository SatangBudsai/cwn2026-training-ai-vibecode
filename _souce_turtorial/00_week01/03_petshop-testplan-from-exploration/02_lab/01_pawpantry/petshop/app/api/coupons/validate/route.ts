import { NextResponse } from "next/server";
import { serverBugMode } from "@/lib/bugmode";
import { evaluateCoupon, priceLines, type CartLine } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { code?: unknown; items?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // treat as empty body
  }
  const code = typeof body.code === "string" ? body.code : "";
  const items = Array.isArray(body.items) ? (body.items as CartLine[]) : [];
  const result = evaluateCoupon(code, priceLines(items), serverBugMode());
  return NextResponse.json({
    ok: result.ok,
    code: result.code,
    discount: result.discount,
    freeShipping: result.freeShipping,
    message: result.message,
  });
}
