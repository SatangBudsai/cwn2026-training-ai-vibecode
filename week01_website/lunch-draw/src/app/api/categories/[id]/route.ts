import { bad } from "@/lib/server";
import { deleteCategory, getCategories, renameCategory } from "@/lib/store";

const MAX_LABEL = 30;

// Rename a food category: { label }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  if (!label) return bad("ใส่ชื่อแนวอาหาร");
  if (label.length > MAX_LABEL) return bad(`ชื่อยาวได้ไม่เกิน ${MAX_LABEL} ตัวอักษร`);
  if (getCategories().some((c) => c.label === label && c.id !== id)) return bad("มีแนวอาหารนี้อยู่แล้ว", 409);
  const c = await renameCategory(id, label);
  if (!c) return bad("not found", 404);
  return Response.json(c);
}

// Delete a food category: it is removed from every restaurant and from room votes
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await deleteCategory(id))) return bad("not found", 404);
  return Response.json({ ok: true });
}
