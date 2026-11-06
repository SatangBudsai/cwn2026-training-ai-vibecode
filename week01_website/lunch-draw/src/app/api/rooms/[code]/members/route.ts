import { bad } from "@/lib/server";
import { addMember } from "@/lib/store";

// Join a room with a nickname. Joining again with the same name returns the same member.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code;
  const body = await req.json().catch(() => null);
  const nickname = String(body?.nickname ?? "").trim().slice(0, 24);
  if (!nickname) return bad("nickname required");
  const member = await addMember(code, nickname);
  if (!member) return bad("room not found", 404);
  return Response.json({ id: member.id, nickname: member.nickname }, { status: 201 });
}
