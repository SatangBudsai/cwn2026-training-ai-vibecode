import { parsePrices } from "@/lib/odds";
import { bad, roomState } from "@/lib/server";
import { setRoomFilters } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const state = await roomState((await params).code);
  if (!state) return bad("room not found", 404);
  return Response.json(state);
}

// Shared filters of a room: { lazyMode?, prices? }
export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code;
  const body = await req.json().catch(() => null);
  if (body?.lazyMode !== undefined && typeof body.lazyMode !== "boolean") return bad("lazyMode must be boolean");
  if (body?.lazyMode === undefined && body?.prices === undefined) return bad("nothing to update");
  const ok = await setRoomFilters(code, {
    ...(body.lazyMode !== undefined && { lazyMode: body.lazyMode }),
    ...(body.prices !== undefined && { prices: parsePrices(body.prices) }),
  });
  if (!ok) return bad("room not found", 404);
  return Response.json(await roomState(code));
}
