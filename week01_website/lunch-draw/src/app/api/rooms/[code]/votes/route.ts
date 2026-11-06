import { CATEGORIES } from "@/lib/categories";
import { bad, roomState } from "@/lib/server";
import { getRoom, updateRoom } from "@/lib/store";

const VALID = new Set<string>(CATEGORIES.map((c) => c.id));

// Set one member's vote for one category: -1, 0 or +1
export async function PUT(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code;
  const body = await req.json().catch(() => null);
  const { memberId, categoryId } = body ?? {};
  const value = Number(body?.value);
  if (typeof memberId !== "string" || !VALID.has(categoryId)) return bad("invalid vote");
  if (![-1, 0, 1].includes(value)) return bad("value must be -1, 0 or 1");

  const room = getRoom(code);
  if (!room) return bad("room not found", 404);
  if (!room.members.some((m) => m.id === memberId)) return bad("member not in room", 404);

  await updateRoom(code, (r) => {
    r.votes = r.votes.filter((v) => !(v.memberId === memberId && v.categoryId === categoryId));
    if (value !== 0) r.votes.push({ memberId, categoryId, value });
  });
  return Response.json(roomState(code));
}
