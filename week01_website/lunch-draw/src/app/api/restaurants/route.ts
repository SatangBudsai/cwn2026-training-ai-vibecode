import { MAX_ADD_RADIUS_M, OFFICE, haversine } from "@/lib/geo";
import { PRICE_LEVELS } from "@/lib/odds";
import { bad, isCategory, listCategories, listRestaurants } from "@/lib/server";
import { addRestaurant } from "@/lib/store";
import { walkingDistance } from "@/lib/walk";


export async function GET() {
  const [restaurants, categories] = await Promise.all([listRestaurants(), listCategories()]);
  return Response.json({ restaurants, categories });
}

// Add a restaurant by hand: { name, lat, lon, categories, nickname?, priceLevel?, openingHours? }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return bad("invalid body");

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  if (!name) return bad("ใส่ชื่อร้าน");

  const lat = Number(body.lat);
  const lon = Number(body.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return bad("ตำแหน่งร้านไม่ถูกต้อง");
  }
  const distance = Math.round(haversine(OFFICE, { lat, lon }));
  if (distance > MAX_ADD_RADIUS_M) return bad(`ร้านอยู่ไกลเกิน ${MAX_ADD_RADIUS_M / 1000} กม. จากออฟฟิศ`);

  const categories = Array.isArray(body.categories) ? [...new Set<string>(body.categories)] : [];
  if (!categories.length) return bad("เลือกประเภทอาหารอย่างน้อย 1 ประเภท");
  for (const c of categories) if (!(await isCategory(c))) return bad("unknown category");

  const priceLevel = body.priceLevel ?? null;
  if (priceLevel !== null && !PRICE_LEVELS.some((p) => p.level === priceLevel)) return bad("priceLevel must be 1–4 or null");

  const nickname = typeof body.nickname === "string" ? body.nickname.trim().slice(0, 40) || null : null;
  const openingHours = typeof body.openingHours === "string" ? body.openingHours.trim().slice(0, 80) || null : null;

  const r = await addRestaurant({
    name,
    nameEn: null,
    lat: Number(lat.toFixed(6)),
    lon: Number(lon.toFixed(6)),
    cuisine: "",
    openingHours,
    distance,
    walkDistance: await walkingDistance(lat, lon),
    categories,
    nickname,
    priceLevel,
  });
  return Response.json({ number: r.number, distance: r.distance, walkDistance: r.walkDistance }, { status: 201 });
}
