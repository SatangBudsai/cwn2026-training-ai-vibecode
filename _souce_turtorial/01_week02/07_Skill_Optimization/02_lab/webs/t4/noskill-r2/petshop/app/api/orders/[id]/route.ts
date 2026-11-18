import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { findOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const order = findOrder(user.id, id);
  if (!order) return NextResponse.json({ error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
  return NextResponse.json({ order });
}
