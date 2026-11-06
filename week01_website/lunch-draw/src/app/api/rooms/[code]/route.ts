import { prisma } from "@/lib/db";
import { bad, roomState } from "@/lib/server";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const state = await roomState((await params).code);
  if (!state) return bad("room not found", 404);
  return Response.json(state);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const body = await req.json().catch(() => null);
  if (typeof body?.lazyMode !== "boolean") return bad("lazyMode must be boolean");
  const room = await prisma.room.updateMany({ where: { code }, data: { lazyMode: body.lazyMode } });
  if (!room.count) return bad("room not found", 404);
  return Response.json(await roomState(code));
}
