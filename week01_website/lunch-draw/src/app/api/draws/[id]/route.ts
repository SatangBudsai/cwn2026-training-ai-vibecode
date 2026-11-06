import { bad } from "@/lib/server";
import { setEaten } from "@/lib/store";

// Confirm (or undo) that the group actually ate at the drawn restaurant.
// Confirmed visits lower that restaurant's odds for the next 7 days.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (typeof body?.eaten !== "boolean") return bad("eaten must be boolean");
  const d = await setEaten(id, body.eaten);
  if (!d) return bad("draw not found", 404);
  return Response.json({
    id: d.id,
    restaurantId: d.restaurantId,
    probability: d.probability,
    createdAt: d.createdAt,
    eatenAt: d.eatenAt,
  });
}
