import data from "../../data/flights-full.json";
import { pool } from "./db";
import { SCHEMA_SQL } from "./schema";
import { ALLIANCE_OF } from "./places";

type Leg = (typeof data.flights)[number]["legs"][number];

function offsetMin(iso: string): number | null {
  const m = iso.match(/([+-])(\d{2}):(\d{2})$/);
  if (!m) return null;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

export async function migrateAndSeed(): Promise<void> {
  const client = await pool().connect();
  try {
    await client.query("SELECT pg_advisory_lock(82082)");
    await client.query(SCHEMA_SQL);
    const { rows } = await client.query("SELECT count(*)::int AS n FROM snapshots");
    if (rows[0].n > 0) return;

    await client.query("BEGIN");
    const m = data.meta;
    const f = data.filters;
    const snap = await client.query(
      `INSERT INTO snapshots (route, travel_date, captured_at, source, caveat, best_count, other_count, more_not_embedded,
         price_min_thb, price_max_thb, layover_min_min, layover_max_min, duration_min_min, duration_max_min)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [m.route, data.flights[0].depart_date, m.inspect_captured_at, m.source, m.caveat, m.best_count, m.other_count,
       m.not_embedded_more_flights_count_inferred, f.price_range_thb.min, f.price_range_thb.max,
       f.layover_duration_range_min.min, f.layover_duration_range_min.max,
       f.total_duration_range_min.min, f.total_duration_range_min.max],
    );
    const sid: number = snap.rows[0].id;

    // airports: from legs (with names + tz) and from the connecting-airport filter list
    const airports = new Map<string, { name: string | null; city: string | null; off: number | null }>();
    const put = (code: string, name: string | null, city: string | null, off: number | null) => {
      const cur = airports.get(code) ?? { name: null, city: null, off: null };
      airports.set(code, { name: cur.name ?? name, city: cur.city ?? city, off: cur.off ?? off });
    };
    for (const c of f.connecting_airports) put(c.code, null, c.city, null);
    for (const fl of data.flights) {
      for (const l of fl.legs as Leg[]) {
        put(l.from_code, l.from_name, null, offsetMin(l.depart_iso_with_tz));
        put(l.to_code, l.to_name, null, offsetMin(l.arrive_iso_with_tz));
      }
      for (const lo of fl.layovers) put(lo.airport_code, lo.airport_name, lo.city, null);
    }
    const CITY: Record<string, string> = { BKK: "กรุงเทพมหานคร", DMK: "กรุงเทพมหานคร", NRT: "โตเกียว", HND: "โตเกียว" };
    for (const [code, a] of airports) {
      await client.query("INSERT INTO airports (code, name_th, city_th, utc_offset_min) VALUES ($1,$2,$3,$4)",
        [code, a.name, a.city ?? CITY[code] ?? null, a.off]);
    }
    for (const c of f.connecting_airports) {
      await client.query("INSERT INTO connecting_airports VALUES ($1,$2)", [sid, c.code]);
    }

    for (const al of f.alliances) await client.query("INSERT INTO alliances VALUES ($1,$2)", [al.code, al.name]);
    const airlines = new Map<string, string>();
    for (const a of f.airlines) airlines.set(a.code, a.name);
    for (const fl of data.flights) {
      fl.airline_codes.forEach((c, i) => { if (!airlines.has(c)) airlines.set(c, fl.airlines[i] ?? c); });
      for (const l of fl.legs as Leg[]) if (!airlines.has(l.marketing_carrier_code)) airlines.set(l.marketing_carrier_code, l.carrier_name);
    }
    const bag = new Map(data.airline_baggage_links.map((x) => [x.code, x.url]));
    const help = new Map(data.airline_special_assistance_links.map((x) => [x.code, x.url]));
    for (const fl of data.flights) for (const s of fl.special_assistance_links) if (!help.has(s.code)) help.set(s.code, s.url);
    for (const [code, name] of airlines) {
      await client.query("INSERT INTO airlines VALUES ($1,$2,$3,$4,$5)",
        [code, name, ALLIANCE_OF[code] ?? null, bag.get(code) ?? null, help.get(code) ?? null]);
    }

    let order = 0;
    for (const fl of data.flights) {
      order += 1;
      const e = fl.emissions;
      const r = await client.query(
        `INSERT INTO flights (snapshot_id, result_group, rank_in_group, display_order, price_thb, origin, destination,
           depart_date, depart_time, arrive_date, arrive_time, total_duration_min, stops,
           co2_g, co2_typical_g, co2_lowest_g, co2_pct, co2_level, co2_label)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
        [sid, fl.group, fl.rank_in_group, order, fl.price_thb, fl.origin, fl.destination, fl.depart_date, fl.depart_time,
         fl.arrive_date, fl.arrive_time, fl.total_duration_min, fl.stops, e.this_flight_g, e.typical_for_route_g,
         e.lowest_g_inferred, e.pct_vs_typical, e.level_code, e.level_label],
      );
      const fid: number = r.rows[0].id;
      for (const [i, c] of fl.airline_codes.entries()) await client.query("INSERT INTO flight_airlines VALUES ($1,$2,$3)", [fid, i, c]);
      for (const [i, l] of (fl.legs as Leg[]).entries()) {
        await client.query(
          `INSERT INTO flight_legs (flight_id, seq, flight_number, carrier_code, operated_by, from_airport, to_airport,
             depart_local, arrive_local, depart_at, arrive_at, duration_min, aircraft, aircraft_code, legroom, co2_g)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [fid, i, l.flight_number, l.marketing_carrier_code, l.operated_by, l.from_code, l.to_code,
           `${l.depart_date} ${l.depart_time}`, `${l.arrive_date} ${l.arrive_time}`, l.depart_iso_with_tz, l.arrive_iso_with_tz,
           l.duration_min, l.aircraft, l.aircraft_code_in_token, l.legroom, l.co2_grams_inferred],
        );
      }
      for (const [i, lo] of fl.layovers.entries()) {
        await client.query("INSERT INTO layovers VALUES ($1,$2,$3,$4,$5)", [fid, i, lo.duration_min, lo.airport_code, lo.change_airport_to]);
      }
    }

    const pi = data.price_insights;
    await client.query("INSERT INTO price_insights VALUES ($1,$2,$3,$4)", [sid, pi.lowest_now_thb, pi.typical_range_thb[0], pi.typical_range_thb[1]]);
    for (const h of pi.history) {
      await client.query("INSERT INTO price_history VALUES ($1, (to_timestamp($2/1000.0) AT TIME ZONE 'Asia/Bangkok')::date, $3) ON CONFLICT DO NOTHING",
        [sid, h.date_utc_ms, h.price_thb]);
    }
    for (const c of data.cheaper_dates) await client.query("INSERT INTO cheaper_dates VALUES ($1,$2,$3)", [sid, c.date, c.price_thb]);
    await client.query("COMMIT");
    console.log(`[seed] inserted snapshot ${sid} with ${data.flights.length} flights`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.query("SELECT pg_advisory_unlock(82082)").catch(() => {});
    client.release();
  }
}
