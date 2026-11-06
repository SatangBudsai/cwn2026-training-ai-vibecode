import { bad, listCategories } from "@/lib/server";
import { addCategory, getCategories } from "@/lib/store";

const MAX_LABEL = 30;

export async function GET() {
  return Response.json(listCategories());
}

// Add a food category: { label }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  if (!label) return bad("ใส่ชื่อแนวอาหาร");
  if (label.length > MAX_LABEL) return bad(`ชื่อยาวได้ไม่เกิน ${MAX_LABEL} ตัวอักษร`);
  if (getCategories().some((c) => c.label === label)) return bad("มีแนวอาหารนี้อยู่แล้ว", 409);
  const c = await addCategory(label);
  return Response.json(c, { status: 201 });
}
