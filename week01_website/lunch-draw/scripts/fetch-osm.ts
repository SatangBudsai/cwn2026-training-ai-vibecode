// Builds data/restaurants.json from OpenStreetMap (free, no API key).
// 1. Overpass: food places within RADIUS_M of the office (cafes excluded)
// 2. OSRM foot profile: real walking distance from the office to each place
// Run: npm run data:fetch
import { writeFileSync, mkdirSync } from "node:fs";
import { OFFICE, RADIUS_M, haversine } from "../src/lib/geo";
import { classify } from "../src/lib/categories";

const UA = "lunch-draw/0.1 (internal lunch picker)";

type OsmEl = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

async function fetchOsm(): Promise<OsmEl[]> {
  const query = `[out:json][timeout:60];(nwr["amenity"~"^(restaurant|fast_food|food_court)$"](around:${RADIUS_M},${OFFICE.lat},${OFFICE.lon}););out center tags;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  return (await res.json()).elements;
}

// One OSRM table request per chunk: source = office, destinations = places.
async function walkDistances(points: { lat: number; lon: number }[]): Promise<(number | null)[]> {
  const out: (number | null)[] = [];
  const CHUNK = 80;
  for (let i = 0; i < points.length; i += CHUNK) {
    const chunk = points.slice(i, i + CHUNK);
    const coords = [OFFICE, ...chunk].map((p) => `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`).join(";");
    const url = `https://routing.openstreetmap.de/routed-foot/table/v1/foot/${coords}?sources=0&annotations=distance`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      const json = await res.json();
      const row: (number | null)[] = json.distances?.[0]?.slice(1) ?? chunk.map(() => null);
      out.push(...row.map((d) => (d == null ? null : Math.round(d))));
    } catch (e) {
      console.warn("walk distance failed for chunk", i, e);
      out.push(...chunk.map(() => null));
    }
    await new Promise((r) => setTimeout(r, 1000)); // be polite to the public server
  }
  return out;
}

async function main() {
  const els = await fetchOsm();
  const seen = new Set<string>();
  const places = els
    .map((e) => {
      const t = e.tags ?? {};
      const name = t["name:th"] || t.name;
      const lat = e.lat ?? e.center?.lat;
      const lon = e.lon ?? e.center?.lon;
      if (!name || lat == null || lon == null) return null;
      const key = `${name}|${lat.toFixed(4)}|${lon.toFixed(4)}`;
      if (seen.has(key)) return null;
      seen.add(key);
      const cuisine = t.cuisine ?? "";
      return {
        osmId: `${e.type}/${e.id}`,
        name,
        nameEn: t["name:en"] ?? (t.name !== name ? t.name : null) ?? null,
        lat,
        lon,
        cuisine,
        openingHours: t.opening_hours ?? null,
        distance: Math.round(haversine(OFFICE, { lat, lon })),
        categories: classify(`${name} ${t.name ?? ""} ${t["name:en"] ?? ""}`, cuisine, t.amenity ?? ""),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => a.distance - b.distance);

  console.log(`places: ${places.length}, fetching walking distances...`);
  const walks = await walkDistances(places);
  const data = places.map((p, i) => ({ number: i + 1, ...p, walkDistance: walks[i] }));

  mkdirSync("data", { recursive: true });
  writeFileSync("data/restaurants.json", JSON.stringify(data, null, 2));
  const lazy = data.filter((d) => (d.walkDistance ?? d.distance * 1.3) <= 500).length;
  console.log(`wrote data/restaurants.json: ${data.length} places, ${lazy} within 500 m walk`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
