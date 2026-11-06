import { bad, isCategory, roomState } from "@/lib/server";
import { getRestaurants, getRoom, updateRoom } from "@/lib/store";


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
  if (forRestaurant ? !getRestaurants().some((x) => x.number === restaurantId) : !isCategory(categoryId)) {
    return bad("invalid vote");
  }
  if (![-1, 0, 1].includes(value)) return bad("value must be -1, 0 or 1");

  const room = getRoom(code);
  if (!room) return bad("room not found", 404);
  if (!room.members.some((m) => m.id === memberId)) return bad("member not in room", 404);

  await updateRoom(code, (r) => {
    if (forRestaurant) {
      const rest = (r.restaurantVotes ?? []).filter((v) => !(v.memberId === memberId && v.restaurantId === restaurantId));
      r.restaurantVotes = value === 0 ? rest : [...rest, { memberId, restaurantId, value }];
    } else {
      r.votes = r.votes.filter((v) => !(v.memberId === memberId && v.categoryId === categoryId));
      if (value !== 0) r.votes.push({ memberId, categoryId, value });
    }
  });
  return Response.json(roomState(code));
}
