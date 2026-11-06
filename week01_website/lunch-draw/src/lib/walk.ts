import "server-only";
import { OFFICE } from "./geo";

/**
 * Walking distance in metres from the office, from the free OSRM foot profile.
 * Returns null when the route service is slow or down; the app then estimates
 * the walk as 1.3 × the straight line. Skipped in e2e tests (LUNCH_TEST=1) so
 * test results never depend on the internet.
 */
export async function walkingDistance(lat: number, lon: number): Promise<number | null> {
  if (process.env.LUNCH_TEST === "1") return null;
  try {
    const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${OFFICE.lon},${OFFICE.lat};${lon},${lat}?overview=false`;
    const res = await fetch(url, {
      headers: { "User-Agent": "lunch-draw/0.1 (internal lunch picker)" },
      signal: AbortSignal.timeout(4000),
    });
    const json = await res.json();
    const d = json.routes?.[0]?.distance;
    return typeof d === "number" ? Math.round(d) : null;
  } catch {
    return null;
  }
}
