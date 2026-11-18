import { q } from "./db";
import { addDays, diffDays } from "./dates";
import type { AirlineOpt, AirportOpt, FlightView, Insights, LayoverView, LegView, SnapshotInfo } from "./types";

/** Layovers of 6 h or more are tagged "แวะพักนาน" (threshold is ours; the source site did not state one). */
export const LONG_LAYOVER_MIN = 360;

const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = (d: Date | string) => (typeof d === "string" ? d.slice(0, 10) : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
const timeStr = (t: string) => t.slice(0, 5);

export async function getSnapshot(): Promise<SnapshotInfo | null> {
  const rows = await q<Record<string, unknown>>(
    `SELECT id, route, to_char(travel_date,'YYYY-MM-DD') AS travel_date, captured_at, more_not_embedded,
            price_max_thb, layover_min_min, layover_max_min, duration_min_min, duration_max_min
       FROM snapshots ORDER BY id DESC LIMIT 1`);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id as number, route: r.route as string, travelDate: r.travel_date as string,
    capturedAt: (r.captured_at as Date).toISOString(), moreNotEmbedded: r.more_not_embedded as number | null,
    priceMax: r.price_max_thb as number, layoverMin: r.layover_min_min as number, layoverMax: r.layover_max_min as number,
    durationMin: r.duration_min_min as number, durationMax: r.duration_max_min as number,
  };
}

/**
 * The captured snapshot covers one travel date. For any other searched date the same itineraries are
 * shown with their dates shifted by `shiftDays` — the UI always labels this as mock data.
 */
export async function getFlights(opts: { origins?: string[]; destinations?: string[]; ids?: number[]; shiftDays: number }): Promise<FlightView[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.origins) { params.push(opts.origins); where.push(`f.origin = ANY($${params.length})`); }
  if (opts.destinations) { params.push(opts.destinations); where.push(`f.destination = ANY($${params.length})`); }
  if (opts.ids) { params.push(opts.ids); where.push(`f.id = ANY($${params.length})`); }
  const flights = await q<Record<string, any>>(
    `SELECT f.*, to_char(f.depart_date,'YYYY-MM-DD') AS dd, to_char(f.arrive_date,'YYYY-MM-DD') AS ad,
            ao.name_th AS origin_name, ad.name_th AS dest_name
       FROM flights f JOIN airports ao ON ao.code = f.origin JOIN airports ad ON ad.code = f.destination
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY f.display_order`, params);
  if (flights.length === 0) return [];
  const ids = flights.map((f) => f.id);
  const [airlines, legs, layovers] = await Promise.all([
    q<Record<string, any>>(
      `SELECT fa.flight_id, a.code, a.name_th, a.alliance_code, a.baggage_url, a.assistance_url
         FROM flight_airlines fa JOIN airlines a ON a.code = fa.airline_code
        WHERE fa.flight_id = ANY($1) ORDER BY fa.flight_id, fa.position`, [ids]),
    q<Record<string, any>>(
      `SELECT l.*, to_char(l.depart_local,'YYYY-MM-DD') AS dd, to_char(l.depart_local,'HH24:MI') AS dt,
              to_char(l.arrive_local,'YYYY-MM-DD') AS ad, to_char(l.arrive_local,'HH24:MI') AS at,
              c.name_th AS carrier_name, fa.name_th AS from_name, ta.name_th AS to_name
         FROM flight_legs l JOIN airlines c ON c.code = l.carrier_code
         JOIN airports fa ON fa.code = l.from_airport JOIN airports ta ON ta.code = l.to_airport
        WHERE l.flight_id = ANY($1) ORDER BY l.flight_id, l.seq`, [ids]),
    q<Record<string, any>>(
      `SELECT lo.*, a.name_th, a.city_th FROM layovers lo JOIN airports a ON a.code = lo.airport_code
        WHERE lo.flight_id = ANY($1) ORDER BY lo.flight_id, lo.seq`, [ids]),
  ]);
  const s = opts.shiftDays;
  return flights.map((f) => {
    const myLegs: LegView[] = legs.filter((l) => l.flight_id === f.id).map((l) => ({
      seq: l.seq, flightNumber: l.flight_number, carrierCode: l.carrier_code, carrierName: l.carrier_name,
      operatedBy: l.operated_by, from: l.from_airport, fromName: l.from_name, to: l.to_airport, toName: l.to_name,
      departDate: addDays(l.dd, s), departTime: l.dt, arriveDate: addDays(l.ad, s), arriveTime: l.at,
      durationMin: l.duration_min, aircraft: l.aircraft, legroom: l.legroom, co2g: l.co2_g,
    }));
    const myLayovers: LayoverView[] = layovers.filter((x) => x.flight_id === f.id).map((x) => {
      const prev = myLegs[x.seq];
      const next = myLegs[x.seq + 1];
      return {
        seq: x.seq, durationMin: x.duration_min, airport: x.airport_code, airportName: x.name_th ?? x.airport_code,
        city: x.city_th, changeAirportTo: x.change_airport_to,
        overnight: !!(prev && next && next.departDate > prev.arriveDate),
        long: x.duration_min >= LONG_LAYOVER_MIN,
      };
    });
    const al = airlines.filter((a) => a.flight_id === f.id);
    const linkFor = (key: "baggage_url" | "assistance_url") =>
      al.filter((a) => a[key]).map((a) => ({ code: a.code, name: a.name_th, url: a[key] as string }));
    const departDate = addDays(dateStr(f.dd), s);
    const arriveDate = addDays(dateStr(f.ad), s);
    return {
      id: f.id, group: f.result_group, rankInGroup: f.rank_in_group, displayOrder: f.display_order, price: f.price_thb,
      origin: f.origin, originName: f.origin_name, destination: f.destination, destinationName: f.dest_name,
      departDate, departTime: timeStr(f.depart_time), arriveDate, arriveTime: timeStr(f.arrive_time),
      dayOffset: diffDays(arriveDate, departDate), durationMin: f.total_duration_min, stops: f.stops,
      airlines: al.map((a) => ({ code: a.code, name: a.name_th, alliance: a.alliance_code })),
      layovers: myLayovers, legs: myLegs,
      co2: { g: f.co2_g, typical: f.co2_typical_g, pct: f.co2_pct, level: f.co2_level, label: f.co2_label },
      assistance: linkFor("assistance_url"),
      baggage: linkFor("baggage_url"),
    } satisfies FlightView;
  });
}

export async function getInsights(snapshotId: number): Promise<Insights | null> {
  const [pi] = await q<Record<string, number>>("SELECT * FROM price_insights WHERE snapshot_id = $1", [snapshotId]);
  if (!pi) return null;
  const history = await q<{ d: string; price_thb: number }>(
    "SELECT to_char(observed_on,'YYYY-MM-DD') AS d, price_thb FROM price_history WHERE snapshot_id = $1 ORDER BY observed_on", [snapshotId]);
  const cheaper = await q<{ d: string; price_thb: number }>(
    "SELECT to_char(travel_date,'YYYY-MM-DD') AS d, price_thb FROM cheaper_dates WHERE snapshot_id = $1 ORDER BY travel_date", [snapshotId]);
  return {
    lowestNow: pi.lowest_now_thb, typicalLow: pi.typical_low, typicalHigh: pi.typical_high,
    history: history.map((h) => ({ date: h.d, price: h.price_thb })),
    cheaper: cheaper.map((c) => ({ date: c.d, price: c.price_thb })),
  };
}

export async function getFilterOptions(snapshotId: number): Promise<{ airlines: AirlineOpt[]; connecting: AirportOpt[] }> {
  const airlines = await q<AirlineOpt>(
    `SELECT DISTINCT a.code, a.name_th AS name, a.alliance_code AS alliance
       FROM airlines a JOIN flight_airlines fa ON fa.airline_code = a.code ORDER BY name`);
  const connecting = await q<AirportOpt>(
    `SELECT a.code, a.city_th AS city, a.name_th AS name FROM connecting_airports c JOIN airports a ON a.code = c.airport_code
      WHERE c.snapshot_id = $1 ORDER BY a.code`, [snapshotId]);
  return { airlines, connecting };
}
