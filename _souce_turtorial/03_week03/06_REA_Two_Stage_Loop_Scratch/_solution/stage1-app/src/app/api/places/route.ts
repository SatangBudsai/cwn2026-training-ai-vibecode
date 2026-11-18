import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

// คำแนะนำสถานที่ (B7): เมืองต้นทาง/ปลายทางของข้อมูล + สนามบินที่มีในข้อมูล
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') || '').trim().toLowerCase();
  const { rows } = await pool.query(`
    SELECT DISTINCT l->'departureAirport'->>'code' AS code, l->'departureAirport'->>'name' AS name FROM flights, jsonb_array_elements(data->'legs') l
    UNION SELECT DISTINCT l->'arrivalAirport'->>'code', l->'arrivalAirport'->>'name' FROM flights, jsonb_array_elements(data->'legs') l`);
  const cities = [
    { kind: 'city', name: 'กรุงเทพมหานคร', label: 'กรุงเทพมหานคร', sub: 'เมืองหลวงของประเทศไทย', codes: ['BKK', 'DMK'], keys: ['กรุงเทพ', 'bangkok', 'bkk', 'ไทย'] },
    { kind: 'city', name: 'โตเกียว', label: 'โตเกียว ญี่ปุ่น', sub: 'เมืองหลวงของญี่ปุ่น', codes: ['HND', 'NRT'], keys: ['โตเกียว', 'tokyo', 'tyo', 'ญี่ปุ่น'] },
  ];
  const out: { kind: string; name: string; label: string; sub: string; codes: string[] }[] = [];
  if (!q) return Response.json(out);
  for (const c of cities) {
    if (c.keys.some(k => k.startsWith(q) || q.startsWith(k)) || c.name.includes(q)) {
      out.push(c);
      for (const code of c.codes) {
        const a = rows.find(r => r.code === code);
        if (a) out.push({ kind: 'airport', name: `${a.name} (${code})`, label: `${a.name} (${code})`, sub: code, codes: [code] });
      }
    }
  }
  for (const a of rows) {
    if (out.some(o => o.codes.length === 1 && o.codes[0] === a.code)) continue;
    if (a.code.toLowerCase() === q || a.name.toLowerCase().includes(q)) out.push({ kind: 'airport', name: `${a.name} (${a.code})`, label: `${a.name} (${a.code})`, sub: a.code, codes: [a.code] });
  }
  return Response.json(out.slice(0, 8));
}
