// node scripts/prepare-data.mjs <spec/data dir>
// สร้าง data/*.json ของแอปจากไฟล์ใน spec/data (ไม่แต่งค่า · ตัดช่อง raw ที่แอปไม่ใช้ออก)
// - flights.json        : 300 ใบ (flights-all.json) + ลำดับรายการเริ่มต้น 21 ใบ (flights-initial.json)
// - insights.json       : ข้อมูลเชิงลึกด้านราคาจาก payload GetShoppingResults (rpc-58.json → [5])
// - booking-options.json: ผู้ขายของเที่ยวบินที่มีข้อมูล (GetBookingResults)
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2] || '../spec/data';
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'data');
const read = f => JSON.parse(fs.readFileSync(path.join(src, f), 'utf8'));

// ข้อความสายการบินที่ payload ระดับใบไม่มี (ดำเนินการโดย … / ชื่อร่วม เช่น "เจเอแอล·บางกอกแอร์เวย์ส")
// อ่านจากบรรทัดสรุปของแถวบนจอที่บันทึกไว้คู่กับใบนั้น (specialLabels.screenText)
function screenAirlines(f) {
  const t = f.specialLabels?.screenText || '';
  const link = (t.match(/link "([^"]+)"/) || [])[1] || '';
  const op = (link.match(/ ดำเนินการโดย (.+?)\. ออกเดินทางจาก /) || [])[1] || null;
  const line = (t.match(/- text: \d{1,2}:\d{2} – \d{1,2}:\d{2}(?:\+\d)? (.+?) (?:\d+ ชม\.|\d+ นาที)/) || [])[1] || null;
  const cabins = (link.match(/ ระยะเวลารวม (?:\d+ ชม\.)?(?: ?\d+ นาที)? (\S+ \+ \S+) /) || [])[1] || null;
  return { operatedBy: op, summaryAirlines: line ? line.replace(/·ดำเนินการโดย .*$/, '') : null, mixedCabin: cabins };
}

const slim = f => {
  const { raw, specialLabels, sourceHarEntry, sourceFile, observedAt, ...rest } = f;
  return {
    ...rest,
    legs: f.legs.map(({ raw, ...l }) => ({ ...l, legroom: (JSON.stringify(raw || '').match(/(\d+) ซม\./) || [])[1] || null })),
    airportChange: !!specialLabels?.airportChange,
    overnightArrival: !!specialLabels?.overnightArrival,
    ...screenAirlines(f),
  };
};

const all = read('flights-all.json');
const initial = read('flights-initial.json');
const key = f => `${f.price.amount}|${f.departureLocal}|${f.arrivalLocal}|${f.legs.map(l => l.flightNumber).join('+')}`;
const allKeys = new Map(all.flights.map((f, i) => [key(f), i]));
const extraInitial = [];
const initialOrder = initial.flights.map(f => {
  if (allKeys.has(key(f))) return { all: allKeys.get(key(f)) };
  extraInitial.push(slim(f));
  return { extra: extraInitial.length - 1 };
});
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'flights.json'), JSON.stringify({
  observedAt: all.observedAt, count: all.count, scope: all.scope,
  flights: all.flights.map(slim), initialOrder, extraInitial,
}));

const rpc = read('rpc-58.json');
const ins = rpc[5];
fs.writeFileSync(path.join(out, 'insights.json'), JSON.stringify({
  observedAt: '2026-11-01T10:07:49.250Z', level: ins[0], current: ins[1][1], typicalLow: ins[4][1], typicalHigh: ins[5][1],
  history: (ins[10]?.[0] || []).map(([t, p]) => ({ t, p })),
}, null, 1));

const bo = read('booking-options.json');
fs.writeFileSync(path.join(out, 'booking-options.json'), JSON.stringify({
  observedAt: bo.observedAt, selectedFlight: bo.selectedFlight, route: bo.route, date: bo.date,
  options: bo.options.map(({ raw, ...o }) => o),
}, null, 1));
console.log(`flights ${all.flights.length} · initial ${initialOrder.length} (นอกชุด 300: ${extraInitial.length}) · history ${ins[10]?.[0]?.length}`);
