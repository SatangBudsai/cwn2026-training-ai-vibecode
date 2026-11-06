import { NextResponse, type NextRequest } from "next/server";
import { filterProducts, parseCatalogQuery } from "@/lib/catalog";
import { liveProducts } from "@/lib/store";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const query = parseCatalogQuery(req.nextUrl.searchParams);
  const items = filterProducts(query, liveProducts());
  return NextResponse.json({ items, total: items.length });
}
