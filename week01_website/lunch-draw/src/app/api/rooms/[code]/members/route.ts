import { prisma } from "@/lib/db";
import { bad } from "@/lib/server";

// Join a room with a nickname. Joining again with the same name returns the same member.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const body = await req.json().catch(() => null);
  const nickname = String(body?.nickname ?? "").trim().slice(0, 24);
  if (!nickname) return bad("nickname required");

  const room = await prisma.room.findUnique({ where: { code }, select: { id: true } });
  if (!room) return bad("room not found", 404);

  const member = await prisma.member.upsert({
    where: { roomId_nickname: { roomId: room.id, nickname } },
    update: {},
    create: { roomId: room.id, nickname },
    select: { id: true, nickname: true },
  });
  return Response.json(member, { status: 201 });
}
