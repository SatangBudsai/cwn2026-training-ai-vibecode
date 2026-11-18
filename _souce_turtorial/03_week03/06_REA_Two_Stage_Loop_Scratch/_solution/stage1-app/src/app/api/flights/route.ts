import { pool } from '@/lib/db';
import { readFilters, anyActive, Sort } from '@/lib/filters';

export const dynamic = 'force-dynamic';

const ORDER: Record<Exclude<Sort, 'best'>, string> = {
  price: 'price, pos', dep: 'dep_minutes, pos', arr: 'arr_local, pos', duration: 'duration, pos', co2: 'co2_kg, pos',
};

// GET /api/flights?scope=initial|all&sort=…&<ตัวกรอง>
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const f = readFilters(q);
  const sort = (q.get('sort') || 'best') as Sort;
  const filtered = anyActive(f);
  const scope = filtered ? 'all' : q.get('scope') === 'all' ? 'all' : 'initial';

  const where: string[] = [];
  const args: unknown[] = [];
  const arg = (v: unknown) => { args.push(v); return `$${args.length}`; };
  if (f.stops) where.push(`stops <= ${arg(+f.stops)}`);
  if (f.airlines) where.push(`airlines <@ ${arg(f.airlines)}::text[]`);
  if (f.maxPrice !== null) where.push(`price <= ${arg(f.maxPrice)}`);
  if (f.depFrom > 0) where.push(`dep_minutes >= ${arg(f.depFrom * 60)}`);
  if (f.depTo < 24) where.push(`dep_minutes < ${arg(f.depTo * 60)}`);
  if (f.arrFrom > 0) where.push(`arr_minutes >= ${arg(f.arrFrom * 60)}`);
  if (f.arrTo < 24) where.push(`arr_minutes < ${arg(f.arrTo * 60)}`);
  if (f.lowEmissions) where.push('co2_pct < -5');
  if (f.connects) where.push(`connects <@ ${arg(f.connects)}::text[]`);
  if (f.layoverMin !== null) where.push(`NOT EXISTS (SELECT 1 FROM jsonb_array_elements(data->'layovers') l WHERE (l->>'durationMinutes')::int < ${arg(f.layoverMin)})`);
  if (f.layoverMax !== null) where.push(`max_layover <= ${arg(f.layoverMax)}`);
  if (f.hideSelfTransfer) where.push(`NOT coalesce((data->>'airportChange')::boolean, false)`);
  if (f.maxDuration !== null) where.push(`duration <= ${arg(f.maxDuration * 60)}`);

  const base = scope === 'initial'
    ? 'SELECT f.*, o.pos AS ord FROM flights f JOIN initial_order o ON o.flight_id = f.id'
    : 'SELECT f.*, f.pos AS ord FROM flights f';
  const sql = `SELECT * FROM (${base}) t ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${sort === 'best' ? (filtered ? 'price, pos' : 'ord') : ORDER[sort]}`;
  const { rows } = await pool.query(sql, args);
  let list = rows;

  // มีตัวกรอง + เรียงแบบยอดนิยม: 3 แถวแรก = "ดีที่สุด" ที่เหลือไล่ราคา
  // ดีที่สุด = ยอดนิยมที่ผ่านตัวกรองก่อน แล้วคะแนน ราคา + ระยะเวลา + จำนวนแวะ − โบนัสเที่ยวบินข้ามคืน (ถึงเช้าวันถัดไป · overnightArrival)
  if (filtered && sort === 'best') {
    const score = (r: { popular: boolean; price: number; duration: number; stops: number; data: { overnightArrival?: boolean } }) =>
      (r.popular ? -1e9 : 0) + r.price + r.duration * 25 + r.stops * 2000 - (r.data.overnightArrival ? 5000 : 0);
    const best = [...rows].sort((a, b) => score(a) - score(b) || a.pos - b.pos).slice(0, 3);
    const bestIds = new Set(best.map(r => r.id));
    list = [...best, ...rows.filter(r => !bestIds.has(r.id))];
  }
  const cheapest = await pool.query(
    `SELECT min(price)::int AS p FROM flights ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`, args);
  return Response.json({
    scope,
    filtered,
    sort,
    popularCount: sort === 'best' ? Math.min(3, list.length) : 0,
    cheapest: cheapest.rows[0]?.p ?? null,
    flights: list.map(r => r.data),
  });
}
