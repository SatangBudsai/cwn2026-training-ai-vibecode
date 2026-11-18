import { NextResponse } from "next/server";
import { diffDays, todayISO } from "@/lib/dates";
import { getFlights, getSnapshot } from "@/lib/flights";
import { airportsOf, parsePlaceIds } from "@/lib/places";
import { parseSearch } from "@/lib/search";

export const dynamic = "force-dynamic";

/** JSON version of the search, sorted cheapest first (default). */
export async function GET(req: Request) {
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const s = parseSearch(sp, todayISO());
  const snap = await getSnapshot();
  if (!snap) return NextResponse.json({ error: "no data" }, { status: 503 });
  const flights = s.cabin === "economy"
    ? await getFlights({ origins: airportsOf(parsePlaceIds(s.from)), destinations: airportsOf(parsePlaceIds(s.to)), shiftDays: diffDays(s.date, snap.travelDate) })
    : [];
  flights.sort((a, b) => a.price - b.price || a.displayOrder - b.displayOrder);
  return NextResponse.json({
    mock: true, capturedAt: snap.capturedAt, snapshotTravelDate: snap.travelDate, search: s, count: flights.length, flights,
  });
}
