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

export function googleMapsUrl(lat: number, lon: number, name?: string) {
  const q = name ? `${name} @${lat},${lon}` : `${lat},${lon}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function googleDirectionsUrl(lat: number, lon: number) {
  return `https://www.google.com/maps/dir/?api=1&origin=${OFFICE.lat},${OFFICE.lon}&destination=${lat},${lon}&travelmode=walking`;
}
