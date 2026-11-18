// node diff/build-spec-data.mjs → spec/data/flights-all.json (300 ใบ) + spec/data/flights-initial.json (21 ใบเริ่มต้น)
// ถอดจาก RPC GetShoppingResults ของรอบเฉลย (diff/live/rpc-*.txt · ไฟล์เดียวกับที่ flights-live*.json ชี้ใน sourceFile)
// ด้วยแผนที่ช่องเดียวกับ explore/d-network/extract.mjs ทุกช่อง (co2e · specialLabels · legs ละเอียด · raw) เพื่อให้ schema เท่าไฟล์เดิม
// screenText มาจาก ariaSnapshot ของจอรอบเดียวกัน (diff/evidence/more.yml, initial.yml) แทน explore/d-network/snapshots/03-more.yml
// ตรวจท้ายสคริปต์: ช่องที่ flights-live*.json มีอยู่แล้วต้องตรงกันทุกใบ ไม่งั้น exit 1
import fs from 'node:fs';

const D = new URL('.', import.meta.url).pathname;
const OUT = D + '../../spec/data/';
const dt = (d, t) => d ? `${d[0]}-${String(d[1]).padStart(2, '0')}-${String(d[2]).padStart(2, '0')}T${String(t?.[0] || 0).padStart(2, '0')}:${String(t?.[1] || 0).padStart(2, '0')}:00` : null;
const isoUtc = s => new Date(s.replace(' ', 'T') + '+07:00').toISOString();   // "2026-11-01 18:34:48" (Asia/Bangkok) → ISO UTC แบบไฟล์เดิม

function payload(file) {
  const txt = fs.readFileSync(D + 'live/' + file, 'utf8');
  for (const line of txt.split('\n')) {
    if (!line.startsWith('[[')) continue;
    for (const v of JSON.parse(line)) if (v[0] === 'wrb.fr' && v[2]) { const a = JSON.parse(v[2]); if (Array.isArray(a?.[2]?.[0])) return { at: txt.slice(2, 21), a }; }
  }
  throw Error('ไม่มี payload ผลค้นหาใน ' + file);
}
function cards(yml) {
  const s = fs.readFileSync(D + 'evidence/' + yml, 'utf8');
  return s.split(/\n      - listitem:/).slice(1).map(t => ({ aria: t.match(/- link "([^"\n]*เลือกเที่ยวบิน)"/)?.[1], text: t.split('\n      - listitem:')[0] })).filter(c => c.aria);
}
// = explore/d-network/extract.mjs (ต่างแค่ observedAt/sourceHarEntry ซึ่งไม่มี HAR → sourceHarEntry: null + sourceFile)
function toFlights({ at, a }, file, cs) {
  const observedAt = isoUtc(at);
  const rows = [...a[2][0].map(r => ({ r, pop: true })), ...(a[3]?.[0] || []).map(r => ({ r, pop: false }))];
  return rows.map(({ r, pop }, i) => {
    const f = r[0], co = f[22], lay = f[13] || [];
    const legs = f[2].map(l => ({ departureAirport: { code: l[3], name: l[4] }, arrivalAirport: { code: l[6], name: l[5] }, departureLocal: dt(l[20], l[8]), arrivalLocal: dt(l[21], l[10]), flightNumber: [...(l[22] || []).slice(0, 2)].join(' '), airlineCode: l[22]?.[0], airlineName: l[22]?.[3] ?? null, aircraft: l[17] ?? null, durationMinutes: l[11], co2eGramsRaw: l[31] ?? null, raw: l }));
    return {
      id: i + 1, popular: pop, observedAt, sourceHarEntry: null, sourceFile: 'rulers/diff/live/' + file,
      departureAirport: f[3], arrivalAirport: f[6], departureLocal: dt(f[4], f[5]), arrivalLocal: dt(f[7], f[8]), airlineCodes: f[0], airlineNames: f[1], durationMinutes: f[9], stopCount: Math.max(0, legs.length - 1), legs,
      layovers: lay.map((l, j) => ({ durationMinutes: l[0], arrivalAirport: l[1], departureAirport: l[2], arrivalAirportName: legs[j]?.arrivalAirport.name ?? null, arrivalCity: l[7], departureAirportName: legs[j + 1]?.departureAirport.name ?? null, departureCity: l[5], airportChange: l[1] !== l[2], raw: l })),
      co2e: { kg: co?.[7] != null ? co[7] / 1000 : null, comparisonPercent: co?.[3] ?? null, typicalKg: co?.[8] != null ? co[8] / 1000 : null, raw: co },
      price: { amount: r[1]?.[0]?.[1] ?? null, currency: 'THB' },
      specialLabels: { screenText: cs[i]?.text ?? null, airportChange: lay.some(l => l[1] !== l[2]), overnightArrival: dt(f[7], f[8])?.slice(0, 10) !== dt(f[4], f[5])?.slice(0, 10), unmappedRawFlags: { row: r.slice(2, 8), itinerary: f.slice(10, 17) } },
      raw: r,
    };
  });
}

// ตรวจกับ flights-live*.json: ทุกช่องที่มีอยู่แล้วต้องตรง และ screenText ของใบที่ i ต้องเป็นลิงก์ที่ราคา/เวลาออกตรงกับใบนั้น
function check(name, flights, live) {
  const errs = [];
  if (flights.length !== live.flights.length) errs.push(`${name}: จำนวน ${flights.length} ≠ ${live.flights.length}`);
  const hm = s => s?.slice(11, 16);
  live.flights.forEach((L, i) => {
    const F = flights[i]; if (!F) return;
    const pick = x => ({ popular: x.popular, departureAirport: x.departureAirport, arrivalAirport: x.arrivalAirport, departureLocal: x.departureLocal, arrivalLocal: x.arrivalLocal, airlineCodes: x.airlineCodes, airlineNames: x.airlineNames, durationMinutes: x.durationMinutes, stopCount: x.stopCount, price: x.price });
    const legs = F.legs.map(l => ({ from: l.departureAirport.code, to: l.arrivalAirport.code, dep: l.departureLocal, arr: l.arrivalLocal, flightNumber: l.flightNumber, airlineName: l.airlineName }));
    const lays = F.layovers.map(l => ({ durationMinutes: l.durationMinutes, arrivalAirport: l.arrivalAirport, departureAirport: l.departureAirport, city: l.arrivalCity }));
    if (JSON.stringify([pick(F), legs, lays]) !== JSON.stringify([pick(L), L.legs, L.layovers])) errs.push(`${name}#${i + 1}: ช่องหลักไม่ตรง flights-live`);
    const m = F.specialLabels.screenText?.match(/ราคาเริ่มต้นที่ (\d+) บาทไทย.*? เวลา (\d{2}:\d{2}) /);
    if (!m || +m[1] !== F.price.amount || m[2] !== hm(F.departureLocal)) errs.push(`${name}#${i + 1}: screenText ไม่ใช่ใบนี้ (${m?.slice(1)})`);
    if (F.co2e.kg == null) errs.push(`${name}#${i + 1}: ไม่มี co2e`);
  });
  return errs;
}

const liveAll = JSON.parse(fs.readFileSync(D + 'live/flights-live.json', 'utf8'));
const liveIni = JSON.parse(fs.readFileSync(D + 'live/flights-live-initial.json', 'utf8'));
const all = toFlights(payload(liveAll.sourceFile), liveAll.sourceFile, cards('more.yml'));
const ini = toFlights(payload(liveIni.sourceFile), liveIni.sourceFile, cards('initial.yml'));
const errs = [...check('all', all, liveAll), ...check('initial', ini, liveIni)];

fs.writeFileSync(OUT + 'flights-all.json', JSON.stringify({ observedAt: isoUtc(liveAll.observedAt), count: all.length, sourceFile: 'rulers/diff/live/' + liveAll.sourceFile,
  scope: 'All itinerary rows returned after more flights, including all legs. Raw arrays retained for unmapped flags. Same capture run as rulers/diff/expected.json (2026-11-01 18:13–18:57 +07).', flights: all }, null, 2));
fs.writeFileSync(OUT + 'flights-initial.json', JSON.stringify({ observedAt: isoUtc(liveIni.observedAt), count: ini.length, sourceFile: 'rulers/diff/live/' + liveIni.sourceFile,
  scope: 'Initial result list shown before "ดูเที่ยวบินเพิ่มเติม" (first search response), in on-screen order: 3 popular + 18. Same schema as flights-all.json.', flights: ini }, null, 2));
console.log(JSON.stringify({ all: all.length, initial: ini.length, errors: errs }, null, 1));
process.exitCode = errs.length ? 1 : 0;
