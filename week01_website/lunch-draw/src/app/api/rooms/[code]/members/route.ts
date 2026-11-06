import { bad } from "@/lib/server";
import { getRoom, newId, updateRoom, type Member } from "@/lib/store";

// Join a room with a nickname. Joining again with the same name returns the same member.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code;
  const body = await req.json().catch(() => null);
  const nickname = String(body?.nickname ?? "").trim().slice(0, 24);
  if (!nickname) return bad("nickname required");
  if (!getRoom(code)) return bad("room not found", 404);

  let member: Member | undefined;
  await updateRoom(code, (r) => {
    member = r.members.find((m) => m.nickname === nickname);
    if (!member) {
      member = { id: newId(), nickname, createdAt: new Date().toISOString() };
      r.members.push(member);
    }
  });
  return Response.json({ id: member!.id, nickname: member!.nickname }, { status: 201 });
}
