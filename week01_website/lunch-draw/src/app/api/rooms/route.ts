import { parsePrices } from "@/lib/odds";
import { newRoomCode } from "@/lib/server";
import { createRoom, getRoom } from "@/lib/store";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  let code = newRoomCode();
  while (getRoom(code)) code = newRoomCode();
  const now = new Date().toISOString();
  await createRoom({
    code,
    lazyMode: Boolean(body?.lazyMode),
    prices: parsePrices(body?.prices),
    createdAt: now,
    updatedAt: now,
    members: [],
    votes: [],
  });
  return Response.json({ code }, { status: 201 });
}
