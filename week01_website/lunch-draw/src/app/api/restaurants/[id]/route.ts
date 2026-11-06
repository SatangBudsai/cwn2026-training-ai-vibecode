import { prisma } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";
import { bad } from "@/lib/server";

const VALID = new Set<string>(CATEGORIES.map((c) => c.id));

// Edit a restaurant's base weight and/or which food categories it serves
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return bad("invalid id");
  const body = await req.json().catch(() => null);
  if (!body) return bad("invalid body");

  const data: { baseWeight?: number } = {};
  if (body.baseWeight !== undefined) {
    const w = Number(body.baseWeight);
    if (!Number.isFinite(w) || w < 0 || w > 5) return bad("baseWeight must be 0–5");
    data.baseWeight = Math.round(w * 2) / 2;
  }

  let categories: string[] | undefined;
  if (body.categories !== undefined) {
    if (!Array.isArray(body.categories) || !body.categories.length) return bad("pick at least one category");
    categories = [...new Set<string>(body.categories)];
    if (categories.some((c) => !VALID.has(c))) return bad("unknown category");
  }

  const exists = await prisma.restaurant.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return bad("not found", 404);

  await prisma.$transaction([
    prisma.restaurant.update({ where: { id }, data }),
    ...(categories
      ? [
          prisma.restaurantCategory.deleteMany({ where: { restaurantId: id } }),
          prisma.restaurantCategory.createMany({
            data: categories.map((categoryId) => ({ restaurantId: id, categoryId })),
          }),
        ]
      : []),
  ]);
  return Response.json({ ok: true });
}
