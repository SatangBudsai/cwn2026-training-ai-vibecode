import { listCategories, listRestaurants } from "@/lib/server";

export async function GET() {
  return Response.json({ restaurants: listRestaurants(), categories: listCategories() });
}
