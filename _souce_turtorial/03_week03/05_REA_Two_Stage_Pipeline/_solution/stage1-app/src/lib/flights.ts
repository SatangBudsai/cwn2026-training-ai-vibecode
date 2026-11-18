import { q } from "./db";
import { addDays, diffDays } from "./dates";
import airlineLabels from "../../data/airline-labels.json";
import type { AirlineOpt, AirportOpt, Appearance, BookingInsights, BookingOption, FlightView, Insights, LayoverView, LegView, SnapshotInfo, StepId, StepInsights } from "./types";

/** Airline text per flight key, decoded from the capture by scripts/v4/extract_airline_labels.py */
const LABELS: Record<string, string> = airlineLabels.labels;

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
  const [airlines, legs, layovers, seen] = await Promise.all([
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
    q<Record<string, any>>(
      `SELECT a.flight_id, a.step, a.result_group, a.price_thb,
              (row_number() OVER (PARTITION BY a.step ORDER BY (a.result_group <> 'best'), a.rank_in_group) - 1)::int AS ord
         FROM flight_appearances a WHERE a.step IN (SELECT step FROM flight_appearances WHERE flight_id = ANY($1))`, [ids]),
  ]);
  const seenBy = new Map<number, Partial<Record<StepId, Appearance>>>();
  for (const a of seen) {
    const m = seenBy.get(a.flight_id) ?? {};
    m[a.step as StepId] = { group: a.result_group, order: a.ord, price: a.price_thb };
    seenBy.set(a.flight_id, m);
  }
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
    // without a captured label: real names (a "multi" trip lists its leg carriers), no partners
    const names = al.some((a) => a.code === "multi") ? [...new Set(myLegs.map((l) => l.carrierName))] : al.map((a) => a.name_th);
    const departDate = addDays(dateStr(f.dd), s);
    const arriveDate = addDays(dateStr(f.ad), s);
    return {
      id: f.id, key: f.flight_key ?? String(f.id), seen: seenBy.get(f.id) ?? {}, group: f.result_group, rankInGroup: f.rank_in_group, displayOrder: f.display_order, price: f.price_thb,
      origin: f.origin, originName: f.origin_name, destination: f.destination, destinationName: f.dest_name,
      departDate, departTime: timeStr(f.depart_time), arriveDate, arriveTime: timeStr(f.arrive_time),
      dayOffset: diffDays(arriveDate, departDate), durationMin: f.total_duration_min, stops: f.stops,
      airlines: al.map((a) => ({ code: a.code, name: a.name_th, alliance: a.alliance_code })),
      airlineLabel: LABELS[f.flight_key] ?? names.join(", "),
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
  const steps = await q<Record<string, any>>("SELECT * FROM search_steps WHERE snapshot_id = $1 ORDER BY har_ordinal", [snapshotId]);
  return {
    steps: steps.map((r): StepInsights => ({
      step: r.step, stopsFilter: r.stops_filter, bestCount: r.best_count, otherCount: r.other_count, notLoaded: r.not_loaded_count,
      lowestNow: r.lowest_now_thb, typicalLow: r.typical_low, typicalHigh: r.typical_high, reference: r.reference_thb,
    })),
    lowestNow: pi.lowest_now_thb, typicalLow: pi.typical_low, typicalHigh: pi.typical_high,
    history: history.map((h) => ({ date: h.d, price: h.price_thb })),
    cheaper: cheaper.map((c) => ({ date: c.d, price: c.price_thb })),
  };
}

export async function getFilterOptions(snapshotId: number): Promise<{ airlines: AirlineOpt[]; connecting: AirportOpt[] }> {
  // F15: the lists come from the full response (64 airlines, 33 airports), not only from the flights on screen
  const airlines = await q<AirlineOpt>(
    `SELECT a.code, a.name_th AS name, a.alliance_code AS alliance
       FROM snapshot_airlines s JOIN airlines a ON a.code = s.airline_code WHERE s.snapshot_id = $1 ORDER BY s.position`, [snapshotId]);
  const connecting = await q<AirportOpt>(
    `SELECT a.code, a.city_th AS city, a.name_th AS name FROM connecting_airports c JOIN airports a ON a.code = c.airport_code
      WHERE c.snapshot_id = $1 ORDER BY a.code`, [snapshotId]);
  return { airlines, connecting };
}

/** F9: sellers captured for an itinerary (only the one opened during the capture has them). */
export async function getBookingOptions(flightId: number): Promise<{ options: BookingOption[]; insights: BookingInsights | null }> {
  const [opts, ins] = await Promise.all([
    q<Record<string, any>>("SELECT * FROM booking_options WHERE flight_id = $1 ORDER BY position", [flightId]),
    q<Record<string, any>>("SELECT * FROM booking_insights WHERE flight_id = $1", [flightId]),
  ]);
  return {
    options: opts.map((o) => ({ sellerCode: o.seller_code, sellerName: o.seller_name, isAirline: o.is_airline, price: o.price_thb, extraFee: o.extra_fee_thb, domain: o.display_domain })),
    insights: ins[0] ? { typicalLow: ins[0].typical_low, typicalHigh: ins[0].typical_high, reference: ins[0].reference_thb, lowestNow: ins[0].lowest_now_thb } : null,
  };
}

/** Calendar prices (C7): lowest captured fare per travel date — the searched date and the "cheaper date" card. */
export async function getCalendarPrices(): Promise<Record<string, number>> {
  const rows = await q<{ d: string; p: number }>(
    `SELECT to_char(s.travel_date,'YYYY-MM-DD') AS d, min(f.price_thb)::int AS p FROM snapshots s JOIN flights f ON f.snapshot_id = s.id GROUP BY 1
     UNION ALL SELECT to_char(travel_date,'YYYY-MM-DD'), price_thb FROM cheaper_dates`);
  return Object.fromEntries(rows.map((r) => [r.d, r.p]));
}
