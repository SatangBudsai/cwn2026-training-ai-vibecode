// node diff/compare-data.mjs
// เทียบเฉลยสด (expected.json, อ่านจากจอ) กับ spec/data/flights-all-1707.json (ข้อมูลชุดเดิม · เครือข่าย 17:07:49 · เดิมชื่อ flights-all.json ก่อนเปลี่ยนตามข้อตัดสิน 2026-11-01)
// และถอด RPC GetShoppingResults ที่เก็บระหว่างรอบเฉลย (diff/live/*.txt) เป็น diff/live/flights-live.json ด้วยแผนที่ช่องเดียวกับ explore/d-network/extract.mjs
// → diff/data-vs-live.json
import fs from 'node:fs';

const D = new URL('.', import.meta.url).pathname;
const exp = JSON.parse(fs.readFileSync(D + 'expected.json', 'utf8'));
const data = JSON.parse(fs.readFileSync(D + '../../spec/data/flights-all-1707.json', 'utf8'));
const S = exp.scenarios;

// ---------- ถอด RPC ของรอบเฉลย ----------
const dt = (d, t) => d ? `${d[0]}-${String(d[1]).padStart(2, '0')}-${String(d[2]).padStart(2, '0')}T${String(t?.[0] || 0).padStart(2, '0')}:${String(t?.[1] || 0).padStart(2, '0')}:00` : null;
function decodeLive() {
  if (!fs.existsSync(D + 'live')) return null;
  const payloads = [];
  for (const f of fs.readdirSync(D + 'live').filter(f => /^rpc-.*\.txt$/.test(f)).sort()) {
    const txt = fs.readFileSync(D + 'live/' + f, 'utf8');
    for (const line of txt.split('\n')) {
      if (!line.startsWith('[[')) continue;
      try { for (const v of JSON.parse(line)) if (v[0] === 'wrb.fr' && v[2]) { const a = JSON.parse(v[2]); if (Array.isArray(a?.[2]?.[0])) payloads.push({ file: f, at: txt.slice(2, 21), a }); } } catch {}
    }
  }
  // ใช้ payload ที่ไม่มีตัวกรองและมีแถวมากที่สุด (= หลังกด "ดูเที่ยวบินเพิ่มเติม")
  const n = p => p.a[2][0].length + (p.a[3]?.[0]?.length || 0);
  const best = payloads.reduce((m, p) => !m || n(p) > n(m) ? p : m, null);
  if (!best) return null;
  // รายการเริ่มต้น (ก่อนกด "ดูเที่ยวบินเพิ่มเติม") มาจาก response แรกของการค้นหา (21 แถว) ไม่ใช่ 21 แถวแรกของชุด 300
  const initial = payloads.filter(p => n(p) === (S.initial?.count || 21) && p.file < best.file).pop();
  if (initial) fs.writeFileSync(D + 'live/flights-live-initial.json', JSON.stringify({ observedAt: initial.at, sourceFile: initial.file, count: n(initial), flights: toFlights(initial) }, null, 1));
  const flights = toFlights(best);
  const out = { observedAt: best.at, sourceFile: best.file, count: flights.length, payloadsSeen: payloads.map(p => ({ file: p.file, rows: n(p) })), flights };
  fs.writeFileSync(D + 'live/flights-live.json', JSON.stringify(out, null, 1));
  out.initialFlights = initial ? toFlights(initial) : null;
  return out;
}
function toFlights(p) {
  const rowsRaw = [...p.a[2][0].map(r => ({ r, pop: true })), ...(p.a[3]?.[0] || []).map(r => ({ r, pop: false }))];
  return rowsRaw.map(({ r, pop }, i) => {
    const f = r[0], legs = f[2];
    return {
      id: i + 1, popular: pop, departureAirport: f[3], arrivalAirport: f[6],
      departureLocal: dt(f[4], f[5]), arrivalLocal: dt(f[7], f[8]), airlineCodes: f[0], airlineNames: f[1],
      durationMinutes: f[9], stopCount: Math.max(0, legs.length - 1),
      legs: legs.map(l => ({ from: l[3], to: l[6], dep: dt(l[20], l[8]), arr: dt(l[21], l[10]), flightNumber: (l[22] || []).slice(0, 2).join(' '), airlineName: l[22]?.[3] ?? null })),
      layovers: (f[13] || []).map(l => ({ durationMinutes: l[0], arrivalAirport: l[1], departureAirport: l[2], city: l[7] })),
      price: { amount: r[1]?.[0]?.[1] ?? null, currency: 'THB' },
    };
  });
}

// ---------- เทียบ ----------
const hhmm = s => s?.slice(11, 16);
const sig = f => `${f.price.amount}|${hhmm(f.departureLocal)}|${f.stopCount}`;
const sigScreen = (s, i) => `${s.prices[i]}|${s.deps[i]}|${s.stops[i]}`;
function multisetDiff(a, b) {   // a, b = arrays of strings
  const m = new Map(); for (const x of a) m.set(x, (m.get(x) || 0) + 1);
  const onlyB = []; for (const x of b) { if (m.get(x)) m.set(x, m.get(x) - 1); else onlyB.push(x); }
  const onlyA = [...m].flatMap(([k, v]) => Array(v).fill(k));
  return { same: a.length - onlyA.length, onlyA, onlyB };
}
function vsScreen(name, flights, initialFlights) {
  const r = {};
  const scr = sc => S[sc] && !S[sc].error ? S[sc].prices.map((_, i) => sigScreen(S[sc], i)) : null;
  const cmp = (sc, sub) => {
    const s = scr(sc); if (!s) return { error: S[sc]?.error || 'ไม่มีผล' };
    const d = sub.map(sig), m = multisetDiff(s, d);
    return { screen: s.length, data: d.length, sameItems: m.same, orderSame: JSON.stringify(s) === JSON.stringify(d), onlyScreen: m.onlyA.slice(0, 15), onlyData: m.onlyB.slice(0, 15) };
  };
  r.more = cmp('more', flights);
  r.popular = { screenFirst3: S.initial?.prices?.slice(0, 3), dataPopular: flights.filter(f => f.popular).map(f => f.price.amount) };
  r.initial = cmp('initial', flights.slice(0, S.initial?.count || 21));   // สมมติฐาน "21 แถวแรกของชุด 300"
  if (initialFlights) r.initialFromFirstResponse = cmp('initial', initialFlights);
  r.nonstop = cmp('nonstop', flights.filter(f => f.stopCount === 0));
  r['thai-only'] = cmp('thai-only', flights.filter(f => f.airlineNames.length && f.airlineNames.every(n => n === 'การบินไทย')));
  r['price-max-10000'] = cmp('price-max-10000', flights.filter(f => f.price.amount <= 10000));
  r['depart-23-24'] = cmp('depart-23-24', flights.filter(f => +hhmm(f.departureLocal).slice(0, 2) >= 23));
  const ld = S['layover-details'];
  if (ld?.row) {
    const f = flights.find(f => f.price.amount === ld.row.price && hhmm(f.departureLocal) === ld.row.dep && f.stopCount === ld.row.stops);
    r['layover-details'] = f ? {
      found: true,
      flightNumbers: { screen: ld.flightNumbers, data: f.legs.map(l => l.flightNumber) },
      layovers: { screen: ld.layovers.map(l => l.code), data: f.layovers.map(l => l.arrivalAirport) },
    } : { found: false, row: ld.row };
  }
  return r;
}

const live = decodeLive();
const report = {
  generatedAt: new Date().toISOString(),
  expectedCapturedAt: [exp.meta.capturedFrom, exp.meta.capturedTo],
  specDataObservedAt: data.observedAt,
  liveDataObservedAt: live?.observedAt ?? null,
  screenVsSpecData: vsScreen('spec', data.flights),
  screenVsLiveData: live ? vsScreen('live', live.flights, live.initialFlights) : null,
};
fs.writeFileSync(D + 'data-vs-live.json', JSON.stringify(report, null, 1));
const brief = o => o && Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.error ? v.error : v.screen != null ? `จอ ${v.screen} · ข้อมูล ${v.data} · ตรงกัน ${v.sameItems} · ลำดับเหมือน ${v.orderSame}` : JSON.stringify(v)]));
console.log(JSON.stringify({ specData: brief(report.screenVsSpecData), liveData: brief(report.screenVsLiveData) }, null, 2));
