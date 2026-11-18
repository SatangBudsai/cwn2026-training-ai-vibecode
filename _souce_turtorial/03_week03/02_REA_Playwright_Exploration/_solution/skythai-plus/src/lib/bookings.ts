import { randomInt } from "node:crypto";
import { pool, q } from "./db";
import { diffDays, isSelectableDate, isValidISO, todayISO } from "./dates";
import { getSnapshot } from "./flights";
import { paxErrors, type Pax } from "./passengers";
import { totalFor } from "./pricing";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function newRef(): string {
  return Array.from({ length: 6 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join("");
}

export interface BookingInput {
  flightId: number;
  date: string;
  pax: Pax;
  cabin: string;
  trip: string;
  name: string;
  email: string;
}

export function validateBooking(b: Partial<BookingInput>, today = todayISO()): Record<string, string> {
  const e: Record<string, string> = {};
  if (!Number.isInteger(b.flightId)) e.flightId = "ไม่พบเที่ยวบิน";
  if (!isValidISO(b.date) || !isSelectableDate(b.date, today)) e.date = "วันเดินทางไม่ถูกต้อง (ต้องไม่เป็นวันในอดีต)";
  if (!b.pax) e.pax = "ข้อมูลผู้โดยสารไม่ครบ";
  else {
    const vals = Object.values(b.pax);
    if (vals.some((v) => !Number.isInteger(v) || v < 0)) e.pax = "จำนวนผู้โดยสารไม่ถูกต้อง";
    else { const pe = paxErrors(b.pax); if (pe.length) e.pax = pe.join(" / "); }
  }
  if (b.cabin !== "economy") e.cabin = "ข้อมูลจำลองมีเฉพาะชั้นประหยัด";
  const name = (b.name ?? "").trim();
  if (name.length < 2) e.name = "กรุณากรอกชื่อ-นามสกุล (อย่างน้อย 2 ตัวอักษร)";
  else if (name.length > 100) e.name = "ชื่อยาวเกินไป";
  const email = (b.email ?? "").trim();
  if (!EMAIL_RE.test(email) || email.length > 200) e.email = "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com";
  return e;
}

export async function createBooking(b: BookingInput): Promise<{ ref: string }> {
  const snap = await getSnapshot();
  if (!snap) throw new Error("no snapshot");
  const [flight] = await q<{ id: number; price_thb: number }>("SELECT id, price_thb FROM flights WHERE id = $1", [b.flightId]);
  if (!flight) throw Object.assign(new Error("ไม่พบเที่ยวบิน"), { status: 404 });
  const total = totalFor(flight.price_thb, b.pax); // C22: same price as shown in the results
  for (let attempt = 0; attempt < 5; attempt++) {
    const ref = newRef();
    try {
      await pool().query(
        `INSERT INTO bookings (booking_ref, flight_id, travel_date, trip_type, cabin, adults, children, infants_seat, infants_lap,
           contact_name, contact_email, price_per_seat, total_price_thb, data_captured_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [ref, b.flightId, b.date, b.trip === "oneway" ? "oneway" : b.trip, "economy", b.pax.adults, b.pax.children, b.pax.infantsSeat,
         b.pax.infantsLap, b.name.trim(), b.email.trim().toLowerCase(), flight.price_thb, total, snap.capturedAt],
      );
      return { ref };
    } catch (err) {
      if ((err as { code?: string }).code === "23505") continue; // duplicate ref → retry
      throw err;
    }
  }
  throw new Error("could not allocate booking reference");
}

export interface BookingRow {
  booking_ref: string; flight_id: number; travel_date: string; trip_type: string; cabin: string;
  adults: number; children: number; infants_seat: number; infants_lap: number;
  contact_name: string; contact_email: string; price_per_seat: number; total_price_thb: number;
  status: string; data_captured_at: Date; created_at: Date; snapshot_date: string;
}

export async function getBooking(ref: string): Promise<BookingRow | null> {
  const rows = await q<BookingRow>(
    `SELECT b.*, to_char(b.travel_date,'YYYY-MM-DD') AS travel_date,
            (SELECT to_char(travel_date,'YYYY-MM-DD') FROM snapshots ORDER BY id DESC LIMIT 1) AS snapshot_date
       FROM bookings b WHERE b.booking_ref = $1`, [ref.toUpperCase()]);
  return rows[0] ?? null;
}

export function shiftFor(travelDate: string, snapshotDate: string): number {
  return diffDays(travelDate, snapshotDate);
}
