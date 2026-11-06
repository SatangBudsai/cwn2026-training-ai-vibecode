import { prisma } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";
import { bad, roomState } from "@/lib/server";

const VALID = new Set<string>(CATEGORIES.map((c) => c.id));

// Set one member's vote for one category: -1, 0 or +1
export async function PUT(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const body = await req.json().catch(() => null);
  const { memberId, categoryId } = body ?? {};
  const value = Number(body?.value);
  if (typeof memberId !== "string" || !VALID.has(categoryId)) return bad("invalid vote");
  if (![-1, 0, 1].includes(value)) return bad("value must be -1, 0 or 1");

  const member = await prisma.member.findFirst({
    where: { id: memberId, room: { code } },
    select: { id: true, roomId: true },
  });
  if (!member) return bad("member not in room", 404);

  if (value === 0) {
    await prisma.categoryVote.deleteMany({ where: { memberId, categoryId } });
  } else {
    await prisma.categoryVote.upsert({
      where: { memberId_categoryId: { memberId, categoryId } },
      update: { value },
      create: { memberId, categoryId, value, roomId: member.roomId },
    });
  }
  return Response.json(await roomState(code));
}
