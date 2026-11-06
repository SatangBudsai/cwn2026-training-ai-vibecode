import { CATEGORIES } from "@/lib/categories";
import { PRICE_LEVELS } from "@/lib/odds";
import { bad } from "@/lib/server";
import { updateRestaurant, type Restaurant } from "@/lib/store";

const VALID = new Set<string>(CATEGORIES.map((c) => c.id));

// Edit a restaurant: base weight, food categories, nickname, price level, disabled.
// Saved into data/restaurants.json.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return bad("invalid id");
  const body = await req.json().catch(() => null);
  if (!body) return bad("invalid body");

  const patch: Partial<Restaurant> = {};
  if (body.baseWeight !== undefined) {
    const w = Number(body.baseWeight);
    if (!Number.isFinite(w) || w < 0.5 || w > 5) return bad("baseWeight must be 0.5–5");
    patch.baseWeight = Math.round(w * 2) / 2;
  }
  if (body.nickname !== undefined) {
    if (body.nickname !== null && typeof body.nickname !== "string") return bad("invalid nickname");
    patch.nickname = body.nickname?.trim().slice(0, 40) || null;
  }
  if (body.priceLevel !== undefined) {
    const ok = body.priceLevel === null || PRICE_LEVELS.some((p) => p.level === body.priceLevel);
    if (!ok) return bad("priceLevel must be 1–4 or null");
    patch.priceLevel = body.priceLevel;
  }
  if (body.disabled !== undefined) {
    if (typeof body.disabled !== "boolean") return bad("disabled must be boolean");
    patch.disabled = body.disabled;
  }
  if (body.categories !== undefined) {
    if (!Array.isArray(body.categories) || !body.categories.length) return bad("pick at least one category");
    const cats = [...new Set<string>(body.categories)];
    if (cats.some((c) => !VALID.has(c))) return bad("unknown category");
    patch.categories = cats;
  }

  const r = await updateRestaurant(id, patch);
  if (!r) return bad("not found", 404);
  return Response.json({ ok: true });
}
