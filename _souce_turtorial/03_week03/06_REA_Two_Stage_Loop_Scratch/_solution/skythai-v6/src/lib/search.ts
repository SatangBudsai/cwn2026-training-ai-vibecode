// พารามิเตอร์การค้นหา (ฟอร์ม) ↔ URL
export type Trip = 'roundtrip' | 'oneway' | 'multicity';
export type Cabin = 'economy' | 'premium' | 'business' | 'first';
export type Pax = { adults: number; children: number; infSeat: number; infLap: number };
export type Query = { trip: Trip; cabin: Cabin; pax: Pax; from: string; to: string; date: string; ret: string };

export const TRIPS: [Trip, string][] = [['roundtrip', 'ไป-กลับ'], ['oneway', 'เที่ยวเดียว'], ['multicity', 'หลายเมือง']];
export const CABINS: [Cabin, string][] = [['economy', 'ชั้นประหยัด'], ['premium', 'ประหยัดพรีเมียม'], ['business', 'ชั้นธุรกิจ'], ['first', 'ชั้นหนึ่ง']];
export const paxTotal = (p: Pax) => p.adults + p.children + p.infSeat + p.infLap;

// ข้อมูลที่มี (spec/data): กรุงเทพมหานคร → โตเกียว เที่ยวเดียว 15 พ.ย. 2026 ชั้นประหยัด
export const DATA_QUERY = { from: 'กรุงเทพมหานคร', to: 'โตเกียว', date: '2026-11-15', trip: 'oneway', cabin: 'economy' };
export const TODAY = '2026-11-01';

export function readQuery(q: URLSearchParams): Query {
  return {
    trip: (q.get('trip') as Trip) || 'oneway',
    cabin: (q.get('cabin') as Cabin) || 'economy',
    pax: { adults: +(q.get('adults') || 1), children: +(q.get('children') || 0), infSeat: +(q.get('infSeat') || 0), infLap: +(q.get('infLap') || 0) },
    from: q.get('from') ?? 'กรุงเทพมหานคร',
    to: q.get('to') ?? '',
    date: q.get('date') ?? '',
    ret: q.get('ret') ?? '',
  };
}
export function queryString(s: Query) {
  const q = new URLSearchParams({ trip: s.trip, cabin: s.cabin, from: s.from, to: s.to, date: s.date });
  if (s.trip === 'roundtrip' && s.ret) q.set('ret', s.ret);
  for (const [k, v] of Object.entries(s.pax)) if (v !== (k === 'adults' ? 1 : 0)) q.set(k, String(v));
  return q.toString();
}
export const hasData = (s: Query) =>
  s.from === DATA_QUERY.from && s.to === DATA_QUERY.to && s.date === DATA_QUERY.date && s.trip === DATA_QUERY.trip && s.cabin === DATA_QUERY.cabin;
