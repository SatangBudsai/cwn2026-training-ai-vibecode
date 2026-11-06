// Kongboonma Building (Chanwanich), Silom Rd between Soi 11 and 13.
// Approximate: confirm on a map and adjust if needed, then re-run `npm run data:fetch`.
export const OFFICE = { lat: 13.7247, lon: 100.5245, name: "อาคารจันวาณิชย์ สีลม" };

export const RADIUS_M = 1000;
export const LAZY_RADIUS_M = 500;

export function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Restaurants added by hand must be within this distance of the office */
export const MAX_ADD_RADIUS_M = 2000;

/**
 * Read a location from what people paste: "13.7243, 100.5251" or a Google Maps link
 * (…/@13.72,100.52,17z · ?q=13.72,100.52 · ?query=… · !3d13.72!4d100.52). Returns null when none found.
 */
export function parseLatLon(text: string): { lat: number; lon: number } | null {
  const s = decodeURIComponent(text.trim());
  const num = String.raw`(-?\d{1,3}(?:\.\d+)?)`;
  const patterns = [
    new RegExp(String.raw`!3d${num}!4d${num}`), // place pin: most precise, check first
    new RegExp(String.raw`@${num},\s*${num}`),
    new RegExp(String.raw`[?&](?:q|query|ll|destination)=${num},\s*${num}`),
    new RegExp(String.raw`^${num}\s*[, ]\s*${num}$`),
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (!m) continue;
    const lat = Number(m[1]);
    const lon = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon };
  }
  return null;
}

export function googleMapsUrl(lat: number, lon: number, name?: string) {
  const q = name ? `${name} @${lat},${lon}` : `${lat},${lon}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function googleDirectionsUrl(lat: number, lon: number) {
  return `https://www.google.com/maps/dir/?api=1&origin=${OFFICE.lat},${OFFICE.lon}&destination=${lat},${lon}&travelmode=walking`;
}
