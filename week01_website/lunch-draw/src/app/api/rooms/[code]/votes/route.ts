import { bad, isCategory, roomState } from "@/lib/server";
import { getRestaurants, getRoom, setVote } from "@/lib/store";

// Set one member's vote: -1, 0 or +1
//   { memberId, categoryId, value }    what kind of food they feel like
//   { memberId, restaurantId, value }  a specific restaurant they want (or not)
export async function PUT(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code;
  const body = await req.json().catch(() => null);
  const { memberId, categoryId, restaurantId } = body ?? {};
  const value = Number(body?.value);
  const forRestaurant = restaurantId !== undefined;
  if (typeof memberId !== "string") return bad("invalid vote");
  const validTarget = forRestaurant
    ? (await getRestaurants()).some((x) => x.number === restaurantId)
    : await isCategory(categoryId);
  if (!validTarget) return bad("invalid vote");
  if (![-1, 0, 1].includes(value)) return bad("value must be -1, 0 or 1");

  const room = await getRoom(code);
  if (!room) return bad("room not found", 404);
  if (!room.members.some((m) => m.id === memberId)) return bad("member not in room", 404);

  await setVote(code, memberId, forRestaurant ? { restaurantId } : { categoryId }, value);
  return Response.json(await roomState(code));
}
