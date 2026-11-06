import { prisma } from "@/lib/db";
import { computeOdds, pick, secureRandom, type CategoryScores } from "@/lib/odds";
import { bad, listRestaurants, roomState } from "@/lib/server";

// The draw always happens on the server, so everyone in a room sees the same result.
// Solo: { lazy, scores }   Room: { roomCode } (lazy mode and votes come from the room)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  let lazy = Boolean(body?.lazy);
  let scores: CategoryScores = {};
  let roomId: string | null = null;

  if (body?.roomCode) {
    const code = String(body.roomCode).toUpperCase();
    const room = await prisma.room.findUnique({ where: { code }, select: { id: true } });
    const state = await roomState(code);
    if (!room || !state) return bad("room not found", 404);
    roomId = room.id;
    lazy = state.lazyMode;
    scores = state.scores;
  } else if (body?.scores && typeof body.scores === "object") {
    for (const [k, v] of Object.entries(body.scores)) {
      const n = Number(v);
      if (Number.isFinite(n)) scores[k] = Math.max(-1, Math.min(1, n));
    }
  }

  const restaurants = await listRestaurants();
  const winner = pick(computeOdds(restaurants, scores, lazy), secureRandom());
  if (!winner) return bad("ไม่มีร้านให้สุ่ม ลองปิดโหมดขี้เกียจเดินหรือปรับน้ำหนัก", 409);

  const draw = await prisma.draw.create({
    data: { roomId, restaurantId: winner.id, probability: winner.p, lazyMode: lazy },
    select: { id: true, restaurantId: true, probability: true, createdAt: true, eatenAt: true },
  });
  return Response.json(draw, { status: 201 });
}
