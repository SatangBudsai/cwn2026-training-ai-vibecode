import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { serverBugMode } from "@/lib/bugmode";
import { createOrder, ordersFor, type CreateOrderInput } from "@/lib/orders";

export const dynamic = "force-dynamic";

const UNAUTHORIZED = { error: "กรุณาเข้าสู่ระบบ" };

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json(UNAUTHORIZED, { status: 401 });
  return NextResponse.json({ orders: ordersFor(user.id) });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json(UNAUTHORIZED, { status: 401 });
  let body: CreateOrderInput = {};
  try {
    body = await req.json();
  } catch {
    // handled as empty order
  }
  const result = createOrder(user, body, serverBugMode());
  if (!result.ok) return NextResponse.json(result.body, { status: result.status });
  return NextResponse.json({ order: result.order, id: result.order.id }, { status: 201 });
}
