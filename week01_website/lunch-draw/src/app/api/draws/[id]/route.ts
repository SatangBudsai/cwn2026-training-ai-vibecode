import { prisma } from "@/lib/db";
import { bad } from "@/lib/server";

// Confirm (or undo) that the group actually ate at the drawn restaurant.
// Confirmed visits lower that restaurant's odds for the next 7 days.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (typeof body?.eaten !== "boolean") return bad("eaten must be boolean");
  const res = await prisma.draw.updateMany({
    where: { id },
    data: { eatenAt: body.eaten ? new Date() : null },
  });
  if (!res.count) return bad("draw not found", 404);
  const draw = await prisma.draw.findUnique({
    where: { id },
    select: { id: true, restaurantId: true, probability: true, createdAt: true, eatenAt: true },
  });
  return Response.json(draw);
}
