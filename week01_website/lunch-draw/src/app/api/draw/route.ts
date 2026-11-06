import {
  computeOdds,
  parsePrices,
  pick,
  secureRandom,
  type CategoryScores,
  type DrawFilter,
  type RestaurantScores,
} from "@/lib/odds";
import { bad, listRestaurants, roomState } from "@/lib/server";
import { addDraw, newId } from "@/lib/store";

// The draw always happens on the server, so everyone in a room sees the same result.
// Solo: { lazy, prices, scores, picks }   Room: { roomCode } (filters and votes come from the room)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const filter: DrawFilter = { lazy: Boolean(body?.lazy), prices: parsePrices(body?.prices) };
  let scores: CategoryScores = {};
  let picks: RestaurantScores = {};
  let roomCode: string | null = null;

  if (body?.roomCode) {
    const state = await roomState(String(body.roomCode));
    if (!state) return bad("room not found", 404);
    roomCode = state.code;
    filter.lazy = state.lazyMode;
    filter.prices = state.prices;
    scores = state.scores;
    picks = state.restaurantScores;
  } else {
    // one person alone: each vote is -1, 0 or +1
    const clamp = (v: unknown) => Math.max(-1, Math.min(1, Number(v)));
    if (body?.scores && typeof body.scores === "object") {
      for (const [k, v] of Object.entries(body.scores)) if (Number.isFinite(Number(v))) scores[k] = clamp(v);
    }
    if (body?.picks && typeof body.picks === "object") {
      for (const [k, v] of Object.entries(body.picks)) if (Number.isFinite(Number(v))) picks[Number(k)] = clamp(v);
    }
  }

  const winner = pick(computeOdds(await listRestaurants(), scores, filter, Date.now(), picks), secureRandom());
  if (!winner) return bad("ไม่มีร้านให้สุ่ม ลองปิดโหมดขี้เกียจเดินหรือเลือกช่วงราคาเพิ่ม", 409);

  const draw = await addDraw({
    id: newId(),
    roomCode,
    restaurantId: winner.id,
    probability: winner.p,
    lazyMode: filter.lazy,
    createdAt: new Date().toISOString(),
    eatenAt: null,
  });
  return Response.json(
    {
      id: draw.id,
      restaurantId: draw.restaurantId,
      probability: draw.probability,
      createdAt: draw.createdAt,
      eatenAt: draw.eatenAt,
    },
    { status: 201 },
  );
}
