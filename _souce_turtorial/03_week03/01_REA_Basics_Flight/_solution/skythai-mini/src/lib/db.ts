import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

export type Layover = { duration: string; airport_name: string; city: string; iata: string };

export type Flight = {
  id: number;
  airline: string;
  operated_by: string | null;
  flight_date: string;
  dep_time: string;
  dep_airport_name: string;
  dep_iata: string;
  arr_time: string;
  arr_airport_name: string;
  arr_iata: string;
  arr_next_day: boolean;
  duration_text: string;
  duration_min: number;
  stops: number;
  layovers: Layover[];
  price_thb: number;
  captured_at: string;
};

export type Booking = {
  booking_code: string;
  passenger_name: string;
  email: string;
  passengers: number;
  total_thb: number;
  status: string;
  created_at: string;
};

export const SORTS = {
  price_asc: { label: "ราคาถูกสุด", sql: "price_thb ASC, duration_min ASC" },
  price_desc: { label: "ราคาแพงสุด", sql: "price_thb DESC, duration_min ASC" },
  duration: { label: "บินเร็วสุด", sql: "duration_min ASC, price_thb ASC" },
  depart: { label: "ออกเดินทางเช้าสุด", sql: "dep_time ASC, price_thb ASC" },
} as const;

export type SortKey = keyof typeof SORTS;

const FLIGHT_COLS = `id, airline, operated_by, to_char(flight_date, 'YYYY-MM-DD') AS flight_date,
  dep_time, dep_airport_name, dep_iata, arr_time, arr_airport_name, arr_iata, arr_next_day,
  duration_text, duration_min, stops, layovers, price_thb, captured_at::text AS captured_at`;

export async function listFlights(sort: SortKey, nonstopOnly: boolean): Promise<Flight[]> {
  // ORDER BY comes from the fixed SORTS whitelist, never from user input directly.
  const where = nonstopOnly ? "WHERE stops = 0" : "";
  const { rows } = await pool.query<Flight>(
    `SELECT ${FLIGHT_COLS} FROM flights ${where} ORDER BY ${SORTS[sort].sql}, id`,
  );
  return rows;
}

export async function getFlight(id: number): Promise<Flight | null> {
  const { rows } = await pool.query<Flight>(`SELECT ${FLIGHT_COLS} FROM flights WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function getBooking(code: string): Promise<(Booking & { flight: Flight }) | null> {
  const { rows } = await pool.query<Booking & { flight_id: number }>(
    `SELECT booking_code, flight_id, passenger_name, email, passengers, total_thb, status,
            created_at::text AS created_at
       FROM bookings WHERE booking_code = $1`,
    [code],
  );
  const b = rows[0];
  if (!b) return null;
  const flight = await getFlight(b.flight_id);
  return flight ? { ...b, flight } : null;
}
