import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

// สายการบิน · สนามบินต่อเครื่อง · ช่วงราคา ของ 300 ใบ (B40 B42 B45)
export async function GET() {
  const airlines = await pool.query(`SELECT DISTINCT unnest(airlines) AS name FROM flights ORDER BY 1`);
  const connects = await pool.query(`
    SELECT DISTINCT l->>'arrivalAirport' AS code, l->>'arrivalCity' AS city, l->>'arrivalAirportName' AS name
    FROM flights, jsonb_array_elements(data->'layovers') l ORDER BY 2, 1`);
  const range = await pool.query('SELECT min(price)::int AS min, max(price)::int AS max, max(duration)::int AS dur FROM flights');
  return Response.json({
    airlines: airlines.rows.map(r => r.name),
    connects: connects.rows.filter((r, i, a) => a.findIndex(x => x.code === r.code) === i),
    price: { min: range.rows[0].min, max: range.rows[0].max },
    maxDurationHours: Math.ceil(range.rows[0].dur / 60),
  });
}
