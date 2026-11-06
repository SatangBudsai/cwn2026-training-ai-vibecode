import { resetForTests } from "@/lib/store";

// Only for the e2e suite: the server must be started with LUNCH_TEST=1
export async function POST() {
  if (process.env.LUNCH_TEST !== "1") return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ restaurants: await resetForTests() });
}
