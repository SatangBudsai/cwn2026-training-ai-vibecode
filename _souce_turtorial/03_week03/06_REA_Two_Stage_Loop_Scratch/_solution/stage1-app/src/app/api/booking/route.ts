import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/booking?id=<flight id> → เที่ยวบิน + ผู้ขาย (ถ้ามีข้อมูล GetBookingResults ของเที่ยวบินนั้น)
export async function GET(req: Request) {
  const id = +(new URL(req.url).searchParams.get('id') || 0);
  const f = await pool.query('SELECT data FROM flights WHERE id = $1', [id]);
  if (!f.rows.length) return Response.json({ error: 'not found' }, { status: 404 });
  const flight = f.rows[0].data;
  const key = flight.legs.map((l: { flightNumber: string }) => l.flightNumber).join('+');
  const bo = await pool.query('SELECT data FROM booking_options WHERE flight_numbers = $1', [key]);
  const ins = await pool.query('SELECT data FROM insights WHERE id = 1');
  return Response.json({ flight, booking: bo.rows[0]?.data ?? null, insights: ins.rows[0]?.data ?? null });
}
