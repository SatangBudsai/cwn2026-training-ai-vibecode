import { prisma } from "@/lib/db";
import { newRoomCode } from "@/lib/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newRoomCode();
    const clash = await prisma.room.findUnique({ where: { code }, select: { id: true } });
    if (clash) continue;
    await prisma.room.create({ data: { code, lazyMode: Boolean(body?.lazyMode) } });
    return Response.json({ code }, { status: 201 });
  }
  return Response.json({ error: "could not create room" }, { status: 500 });
}
