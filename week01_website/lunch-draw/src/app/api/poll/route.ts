import { listCategories, listRestaurants, roomState } from "@/lib/server";
import { dataVersion } from "@/lib/store";

// Live updates for Redis mode (Vercel), polled about once a second.
// GET /api/poll?v=<last version>&room=<code>
//   -> { v, room? }                              room state is small: always sent
//   -> { v, restaurants, categories, room? }     restaurant data only when it changed
export async function GET(req: Request) {
  const url = new URL(req.url);
  const seen = Number(url.searchParams.get("v") ?? -1);
  const code = url.searchParams.get("room");
  const v = await dataVersion();
  const [room, data] = await Promise.all([
    code ? roomState(code) : null,
    v !== seen ? Promise.all([listRestaurants(), listCategories()]) : null,
  ]);
  return Response.json(
    { v, ...(code && { room }), ...(data && { restaurants: data[0], categories: data[1] }) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
