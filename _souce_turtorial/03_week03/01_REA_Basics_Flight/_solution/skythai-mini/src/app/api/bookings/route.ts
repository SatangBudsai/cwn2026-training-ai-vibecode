import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { getFlight, pool } from "@/lib/db";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_CHARS[randomInt(CODE_CHARS.length)];
  return `STM-${s}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const flightId = Number(body?.flightId);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();

  if (!Number.isInteger(flightId) || flightId <= 0) {
    return NextResponse.json({ error: "เที่ยวบินไม่ถูกต้อง" }, { status: 400 });
  }
  if (name.length < 2 || name.length > 100) {
    return NextResponse.json({ error: "กรุณากรอกชื่อ-นามสกุล (2–100 ตัวอักษร)" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
  }
  const flight = await getFlight(flightId);
  if (!flight) return NextResponse.json({ error: "ไม่พบเที่ยวบิน" }, { status: 404 });

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const { rows } = await pool.query<{ booking_code: string }>(
      `INSERT INTO bookings (booking_code, flight_id, passenger_name, email, passengers, total_thb)
       VALUES ($1, $2, $3, $4, 1, $5)
       ON CONFLICT (booking_code) DO NOTHING
       RETURNING booking_code`,
      [code, flight.id, name, email, flight.price_thb],
    );
    if (rows[0]) return NextResponse.json({ bookingCode: rows[0].booking_code }, { status: 201 });
  }
  return NextResponse.json({ error: "สร้างรหัสจองไม่สำเร็จ ลองใหม่อีกครั้ง" }, { status: 500 });
}
