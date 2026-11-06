import { bad } from "@/lib/server";
import { getRestaurants, setRating } from "@/lib/store";

// Rate a restaurant with a cat: { rater, score: 1–4 (0 = take back), name? }
// `rater` is a random id the browser keeps, so each person has one rating per place.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || !getRestaurants().some((r) => r.number === id)) return bad("not found", 404);
  const body = await req.json().catch(() => null);
  const rater = typeof body?.rater === "string" ? body.rater.trim() : "";
  if (!/^[\w-]{8,64}$/.test(rater)) return bad("invalid rater");
  const score = Number(body?.score);
  if (![0, 1, 2, 3, 4].includes(score)) return bad("score must be 0–4");
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 24) || null : null;
  await setRating(id, rater, score, name);
  return Response.json({ ok: true });
}
