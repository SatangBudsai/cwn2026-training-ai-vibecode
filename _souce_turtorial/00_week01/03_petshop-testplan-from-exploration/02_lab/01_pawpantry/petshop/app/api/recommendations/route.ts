import { NextResponse, type NextRequest } from "next/server";
import { parseFinderParams, recommend } from "@/lib/finder";
import { liveProducts } from "@/lib/store";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const input = parseFinderParams(req.nextUrl.searchParams);
  if (!input) return NextResponse.json({ error: "กรุณาระบุ pet=cat หรือ pet=dog" }, { status: 400 });
  const results = recommend(input, liveProducts());
  const items = results.map((r) => ({ ...r.product, score: r.score, reasons: r.reasons }));
  return NextResponse.json({ items, total: items.length });
}
