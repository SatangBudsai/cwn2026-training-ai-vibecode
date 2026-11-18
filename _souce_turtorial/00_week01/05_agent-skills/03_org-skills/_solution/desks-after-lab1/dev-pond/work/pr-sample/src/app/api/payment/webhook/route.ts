import { prisma } from "@/lib/db";
import { markOrderPaid } from "@/modules/payment/repository";

export async function POST(req: Request) {
  const event = await req.json();
  try {
    await markOrderPaid(event.orderId);
    await prisma.$executeRaw`UPDATE members SET points = points + ${event.amount / 100} WHERE id = ${event.memberId}`;
  } catch (e) {}
  return Response.json({ ok: true });
}
