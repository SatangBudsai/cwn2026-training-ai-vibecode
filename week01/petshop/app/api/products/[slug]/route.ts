import { NextResponse } from "next/server";
import { liveProducts } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const product = liveProducts().find((p) => p.slug === slug);
  if (!product) return NextResponse.json({ error: "ไม่พบสินค้า" }, { status: 404 });
  return NextResponse.json(product);
}
