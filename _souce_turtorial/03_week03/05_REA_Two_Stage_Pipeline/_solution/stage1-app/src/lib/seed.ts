import data from "../../data/flights-all.json";
import lab2 from "../../data/flights-full.json";
import { pool } from "./db";
import { SCHEMA_SQL } from "./schema";
import { ALLIANCE_OF } from "./places";

/**
 * v3 seeds from flights-all.json: all 300 itineraries decoded from the network capture (EXPLORATION F).
 * flights-full.json (v2, embedded HTML) is only used for what the network file does not repeat:
 * the full price-history series and the airline baggage / assistance links.
 */
type Flight = (typeof data.flights)[number];
type Leg = Flight["legs"][number];
type Step = (typeof data.responses)[number];

/** HAR startedDateTime of the first request (31 Oct 2026 17:03 UTC = 1 Nov 00:03 Bangkok). */
const CAPTURED_AT = "2026-10-31T17:03:18.795Z";

function offsetMin(iso: string | null): number | null {
  const m = iso?.match(/([+-])(\d{2}):(\d{2})$/);
  if (!m) return null;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

const STOPS_FILTER: Record<string, number> = { initial: 0, more_flights: 0, nonstop_filter: 1 };

export async function migrateAndSeed(): Promise<void> {
  const client = await pool().connect();
  try {
    await client.query("SELECT pg_advisory_lock(83083)");
    await client.query(SCHEMA_SQL);
    const { rows } = await client.query("SELECT count(*)::int AS n FROM snapshots");
    if (rows[0].n > 0) return;

    await client.query("BEGIN");
    const steps = new Map<string, Step>(data.responses.map((r) => [r.step, r]));
    const full = steps.get("more_flights")!;
    const initial = steps.get("initial")!;
    const f = full.filters;
    const snap = await client.query(
      `INSERT INTO snapshots (route, travel_date, captured_at, source, caveat, best_count, other_count, more_not_embedded,
         price_min_thb, price_max_thb, layover_min_min, layover_max_min, duration_min_min, duration_max_min)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [data.meta.route, initial.request.date, CAPTURED_AT, data.meta.source,
       "ข้อมูลจำลองจากการค้นหา 1 รอบ ราคาเปลี่ยนได้ทุกครั้งที่ค้นหาใหม่ (F14)",
       initial.best_count, initial.other_count, initial.not_loaded_count, f.price_range_thb.min, f.price_range_thb.max,
       f.layover_duration_range_min.min, f.layover_duration_range_min.max,
       f.total_duration_range_min.min, f.total_duration_range_min.max],
    );
    const sid: number = snap.rows[0].id;

    // airports: from legs (names + UTC offset), layovers and the connecting-airport filter list
    const airports = new Map<string, { name: string | null; city: string | null; off: number | null }>();
    const put = (code: string, name: string | null, city: string | null, off: number | null) => {
      const cur = airports.get(code) ?? { name: null, city: null, off: null };
      airports.set(code, { name: cur.name ?? name, city: cur.city ?? city, off: cur.off ?? off });
    };
    for (const c of f.connecting_airports) put(c.code, null, c.city, null);
    const allFlights: Flight[] = [...data.flights, data.booking.selected_flight as unknown as Flight];
    for (const fl of allFlights) {
      for (const l of fl.legs as Leg[]) {
        put(l.from_code, l.from_name, null, offsetMin(l.depart_iso_with_tz));
        put(l.to_code, l.to_name, null, offsetMin(l.arrive_iso_with_tz));
      }
      for (const lo of fl.layovers) {
        put(lo.airport_code, lo.airport_name, lo.city, null);
        if (lo.change_airport_to) put(lo.change_airport_to, null, lo.city, null);
      }
    }
    const CITY: Record<string, string> = { BKK: "กรุงเทพมหานคร", DMK: "กรุงเทพมหานคร", NRT: "โตเกียว", HND: "โตเกียว" };
    for (const [code, a] of airports) {
      await client.query("INSERT INTO airports (code, name_th, city_th, utc_offset_min) VALUES ($1,$2,$3,$4)",
        [code, a.name, a.city ?? CITY[code] ?? null, a.off]);
    }
    for (const c of f.connecting_airports) await client.query("INSERT INTO connecting_airports VALUES ($1,$2)", [sid, c.code]);

    for (const al of f.alliances) await client.query("INSERT INTO alliances VALUES ($1,$2)", [al.code, al.name]);
    const airlines = new Map<string, string>();
    for (const a of f.airlines) airlines.set(a.code, a.name);
    for (const fl of data.flights) {
      fl.airline_codes.forEach((c, i) => { if (!airlines.has(c)) airlines.set(c, c === "multi" ? "หลายสายการบิน" : fl.airlines[i] ?? c); });
      for (const l of fl.legs as Leg[]) if (!airlines.has(l.marketing_carrier_code)) airlines.set(l.marketing_carrier_code, l.carrier_name);
    }
    const bag = new Map(lab2.airline_baggage_links.map((x) => [x.code, x.url]));
    for (const b of data.booking.baggage_links) bag.set(b.code, b.url);
    const help = new Map(lab2.airline_special_assistance_links.map((x) => [x.code, x.url]));
    for (const fl of data.flights) for (const s of fl.special_assistance_links) if (!help.has(s.code)) help.set(s.code, s.url);
    for (const [code, name] of airlines) {
      await client.query("INSERT INTO airlines VALUES ($1,$2,$3,$4,$5)",
        [code, name, ALLIANCE_OF[code] ?? null, bag.get(code) ?? null, help.get(code) ?? null]);
    }
    for (const [i, a] of f.airlines.entries()) await client.query("INSERT INTO snapshot_airlines VALUES ($1,$2,$3)", [sid, a.code, i]);

    // one search_steps row per FlightsFrontendService request (F2, F3, F4, F7, F8)
    for (const r of data.responses) {
      const pi = r.price_insights;
      await client.query(
        `INSERT INTO search_steps VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [sid, r.step, r.har_ordinal, STOPS_FILTER[r.step] ?? 0, r.best_count, r.other_count, r.not_loaded_count ?? null,
         pi.this_price_thb, pi.typical_range_thb[0], pi.typical_range_thb[1], pi.reference_price_thb, pi.level_code_inferred],
      );
    }

    // display_order = position in the full ("ดูเที่ยวบินเพิ่มเติม") response: best first, then the others
    const moreOf = (fl: Flight) => fl.seen_in.find((s) => s.step === "more_flights")!;
    const ordered = [...data.flights].sort((a, b) => {
      const x = moreOf(a), y = moreOf(b);
      return (x.group === "best" ? 0 : 1) - (y.group === "best" ? 0 : 1) || x.rank_in_group - y.rank_in_group;
    });
    const idByKey = new Map<string, number>();
    for (const [i, fl] of ordered.entries()) {
      const e = fl.emissions;
      const m = moreOf(fl);
      const r = await client.query(
        `INSERT INTO flights (snapshot_id, result_group, rank_in_group, display_order, price_thb, origin, destination,
           depart_date, depart_time, arrive_date, arrive_time, total_duration_min, stops,
           co2_g, co2_typical_g, co2_lowest_g, co2_pct, co2_level, co2_label, flight_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id`,
        [sid, m.group, m.rank_in_group, i + 1, fl.price_thb, fl.origin, fl.destination, fl.depart_date, fl.depart_time,
         fl.arrive_date, fl.arrive_time, fl.total_duration_min, fl.stops, e.this_flight_g, e.typical_for_route_g,
         e.lowest_g_inferred, e.pct_vs_typical, e.level_code, e.level_label, fl.key],
      );
      const fid: number = r.rows[0].id;
      idByKey.set(fl.key, fid);
      for (const [p, c] of fl.airline_codes.entries()) await client.query("INSERT INTO flight_airlines VALUES ($1,$2,$3)", [fid, p, c]);
      for (const [p, l] of (fl.legs as Leg[]).entries()) {
        await client.query(
          `INSERT INTO flight_legs (flight_id, seq, flight_number, carrier_code, operated_by, from_airport, to_airport,
             depart_local, arrive_local, depart_at, arrive_at, duration_min, aircraft, aircraft_code, legroom, co2_g)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [fid, p, l.flight_number, l.marketing_carrier_code, l.operated_by, l.from_code, l.to_code,
           `${l.depart_date} ${l.depart_time}`, `${l.arrive_date} ${l.arrive_time}`,
           l.depart_iso_with_tz ?? `${l.depart_date}T${l.depart_time}:00+07:00`, l.arrive_iso_with_tz ?? `${l.arrive_date}T${l.arrive_time}:00+09:00`,
           l.duration_min, l.aircraft, l.aircraft_code_in_token, l.legroom, l.co2_grams_inferred],
        );
      }
      for (const [p, lo] of fl.layovers.entries()) {
        await client.query("INSERT INTO layovers VALUES ($1,$2,$3,$4,$5)", [fid, p, lo.duration_min, lo.airport_code, lo.change_airport_to]);
      }
      for (const s of fl.seen_in) {
        await client.query("INSERT INTO flight_appearances VALUES ($1,$2,$3,$4,$5)", [fid, s.step, s.group, s.rank_in_group, s.price_thb]);
      }
    }

    // F9: booking options of the itinerary that was opened in the capture (VZ 832)
    const bk = data.booking;
    const bookedKey = data.flights.find((fl) => fl.key.startsWith(bk.selected_key))?.key;
    const bookedId = bookedKey ? idByKey.get(bookedKey) : undefined;
    if (bookedId) {
      for (const [p, o] of bk.options.entries()) {
        await client.query("INSERT INTO booking_options VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
          [bookedId, p, o.seller_code, o.seller_name, o.is_airline, o.price_thb, o.extra_fee_thb, o.display_domain]);
      }
      const bi = bk.price_insights_for_selected;
      await client.query("INSERT INTO booking_insights VALUES ($1,$2,$3,$4,$5)",
        [bookedId, bi.typical_range_thb[0], bi.typical_range_thb[1], bi.reference_price_thb, bi.this_price_thb]);
    }

    const pi = full.price_insights;
    await client.query("INSERT INTO price_insights VALUES ($1,$2,$3,$4)", [sid, pi.this_price_thb, pi.typical_range_thb[0], pi.typical_range_thb[1]]);
    // the network file only has the first/last points; the series itself comes from the v2 capture (LAB 2)
    const hist = new Map<number, number>(lab2.price_insights.history.map((h) => [h.date_utc_ms, h.price_thb]));
    for (const [ms, price] of pi.history_first_last as [number, number][]) hist.set(ms, price);
    for (const [ms, price] of hist) {
      await client.query("INSERT INTO price_history VALUES ($1, (to_timestamp($2/1000.0) AT TIME ZONE 'Asia/Bangkok')::date, $3) ON CONFLICT (snapshot_id, observed_on) DO UPDATE SET price_thb = EXCLUDED.price_thb",
        [sid, ms, price]);
    }
    for (const c of initial.cheaper_dates) await client.query("INSERT INTO cheaper_dates VALUES ($1,$2,$3)", [sid, c.date, c.price_thb]);
    await client.query("COMMIT");
    console.log(`[seed] inserted snapshot ${sid} with ${data.flights.length} flights from flights-all.json`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.query("SELECT pg_advisory_unlock(83083)").catch(() => {});
    client.release();
  }
}
