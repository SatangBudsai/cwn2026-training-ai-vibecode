import { listCategories, listRestaurants } from "@/lib/server";

export async function GET() {
  const [restaurants, categories] = await Promise.all([listRestaurants(), listCategories()]);
  return Response.json({ restaurants, categories });
}
