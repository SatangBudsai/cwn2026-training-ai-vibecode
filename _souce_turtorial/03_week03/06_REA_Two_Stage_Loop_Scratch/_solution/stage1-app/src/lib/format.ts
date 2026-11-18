// ข้อความบนจอและชื่อ ARIA ของแถวเที่ยวบิน — สร้างจากช่องข้อมูลของแต่ละใบ (รูปแบบตาม spec/EXPLORATION.md B31 B33 B34 B35 B37 / D5)
export type Leg = {
  departureAirport: { code: string; name: string };
  arrivalAirport: { code: string; name: string };
  departureLocal: string;
  arrivalLocal: string;
  flightNumber: string;
  airlineCode: string;
  airlineName: string;
  aircraft: string | null;
  durationMinutes: number;
  co2eGramsRaw: number | null;
  legroom: string | null;
};
export type Layover = {
  durationMinutes: number;
  arrivalAirport: string;
  departureAirport: string;
  arrivalAirportName: string;
  arrivalCity: string;
  departureAirportName: string;
  departureCity: string;
  airportChange: boolean;
};
export type Flight = {
  id: number;
  popular: boolean;
  departureAirport: string;
  arrivalAirport: string;
  departureLocal: string;
  arrivalLocal: string;
  airlineCodes: string;
  airlineNames: string[];
  durationMinutes: number;
  stopCount: number;
  legs: Leg[];
  layovers: Layover[];
  co2e: { kg: number; comparisonPercent: number; typicalKg: number };
  price: { amount: number; currency: string };
  airportChange: boolean;
  overnightArrival: boolean;
  operatedBy: string | null;
  summaryAirlines: string | null;
  mixedCabin: string | null;
};

const DAY_LONG = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
const DAY_SHORT = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const MONTH_LONG = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const parts = (iso: string) => {
  const [d, t] = iso.split('T');
  const [y, m, day] = d.split('-').map(Number);
  return { y, m, day, time: t.slice(0, 5), dow: new Date(Date.UTC(y, m - 1, day)).getUTCDay() };
};
export const time = (iso: string) => parts(iso).time;
export const dateAria = (iso: string) => { const p = parts(iso); return `${DAY_LONG[p.dow]}, ${MONTH_LONG[p.m - 1]} ${p.day}`; };
export const dateShort = (iso: string) => { const p = parts(iso); return `${DAY_SHORT[p.dow]} ${p.day} ${MONTH_SHORT[p.m - 1]}`; };
export const dateCalendar = (y: number, m: number, d: number) =>
  `${DAY_LONG[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}ที่ ${d} ${MONTH_LONG[m - 1]} ค.ศ. ${y}`;
export const monthName = (m: number) => MONTH_LONG[m - 1];
export const dayDiff = (a: string, b: string) => {
  const pa = parts(a), pb = parts(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.day) - Date.UTC(pa.y, pa.m - 1, pa.day)) / 86400000);
};
export const plusDays = (from: string, to: string) => { const n = dayDiff(from, to); return n > 0 ? `+${n}` : ''; };

export const duration = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  return [h ? `${h} ชม.` : '', m ? `${m} นาที` : ''].filter(Boolean).join(' ');
};
export const baht = (n: number) => `฿${n.toLocaleString('en-US')}`;

const joinAnd = (names: string[]) => names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} และ${names[names.length - 1]}`;

function layoverAria(f: Flight) {
  return f.layovers.map((l, i) => {
    const head = `การแวะพัก (ครั้งที่ ${i + 1} จาก ${f.layovers.length}) ใช้เวลาแวะพัก ${duration(l.durationMinutes)}`;
    return l.airportChange || l.arrivalAirport !== l.departureAirport
      ? `${head} ใน${l.arrivalCity} เปลี่ยนจาก ${l.arrivalAirportName} ไปยัง ${l.departureAirportName} ที่นี่`
      : `${head} ที่สนามบิน ${l.arrivalAirportName} ใน${l.arrivalCity}`;
  }).join(' ');
}

const first = (f: Flight) => f.legs[0];
const last = (f: Flight) => f.legs[f.legs.length - 1];

export function routeAria(f: Flight) {
  return `ออกเดินทางจาก ${first(f).departureAirport.name} เวลา ${time(f.departureLocal)} ในวันที่ ${dateAria(f.departureLocal)} และเดินทางถึง ${last(f).arrivalAirport.name} เวลา ${time(f.arrivalLocal)} ในวันที่ ${dateAria(f.arrivalLocal)}`;
}

export function rowLinkName(f: Flight) {
  const kind = f.stopCount === 0 ? 'เที่ยวบินตรง' : `เที่ยวบินแบบแวะพัก ${f.stopCount} ครั้ง`;
  const airlines = joinAnd(f.airlineNames) + (f.operatedBy ? ` ดำเนินการโดย ${f.operatedBy}.` : '');
  const lay = (f.mixedCabin ? ` ${f.mixedCabin}` : '') + (f.stopCount ? ` ${layoverAria(f)}` : '');
  return `ราคาเริ่มต้นที่ ${f.price.amount} บาทไทย เดินทางด้วย${kind}กับ ${airlines} ${routeAria(f)} ระยะเวลารวม ${duration(f.durationMinutes)}${lay} เลือกเที่ยวบิน`;
}

export const displayAirlines = (f: Flight) => f.summaryAirlines || f.airlineNames.join(', ');

export function stopsSummary(f: Flight) {
  if (f.stopCount === 0) return 'บินตรง';
  const base = `หยุดพัก ${f.stopCount} ครั้ง`;
  if (f.layovers.some(l => l.airportChange || l.arrivalAirport !== l.departureAirport)) return `${base} มีการเปลี่ยนสนามบิน`;
  if (f.stopCount === 1) return `${base} ${duration(f.layovers[0].durationMinutes)} ${f.layovers[0].arrivalAirport}`;
  return `${base} ${f.layovers.map(l => l.arrivalAirport).join(', ')}`;
}

export function rowSummary(f: Flight) {
  const op = f.operatedBy ? `·ดำเนินการโดย ${f.operatedBy}` : '';
  return `${time(f.departureLocal)} – ${time(f.arrivalLocal)}${plusDays(f.departureLocal, f.arrivalLocal)} ${displayAirlines(f)}${op} ${duration(f.durationMinutes)} ${stopsSummary(f)}`;
}

export function co2Label(f: Flight) {
  const p = f.co2e.comparisonPercent;
  const cmp = Math.abs(p) <= 5 ? 'การปล่อยก๊าซโดยเฉลี่ย' : `ปริมาณการปล่อยก๊าซ ${p > 0 ? '+' : ''}${p}%`;
  return `ปริมาณการปล่อยก๊าซคาร์บอนโดยประมาณ: ${f.co2e.kg.toLocaleString('en-US')} กิโลกรัม. ${cmp}. ดูข้อมูลเพิ่มเติมเกี่ยวกับปริมาณการปล่อยก๊าซนี้`;
}
export const co2Short = (f: Flight) => `CO2e ${f.co2e.kg}กก.`;
export const detailsLabel = (f: Flight) => `รายละเอียดเที่ยวบิน ${routeAria(f)}`;

// บรรทัดของแต่ละขาในแถวที่ขยาย (B34) และแถบจุดแวะ (B35)
export function legText(l: Leg, overnight: boolean) {
  return {
    dep: `${time(l.departureLocal)}·${l.departureAirport.name} (${l.departureAirport.code})`,
    travel: `เวลาเดินทาง: ${duration(l.durationMinutes)}${overnight ? '· ข้ามคืน' : ''}`,
    arr: `${time(l.arrivalLocal)}${plusDays(l.departureLocal, l.arrivalLocal)}·${l.arrivalAirport.name} (${l.arrivalAirport.code})`,
    info: [l.airlineName, 'ชั้นประหยัด', l.aircraft, l.flightNumber].filter(Boolean).join(' · '),
  };
}
export function layoverText(l: Layover) {
  const change = l.airportChange || l.arrivalAirport !== l.departureAirport;
  const place = change ? l.arrivalCity : `${l.arrivalCity} (${l.arrivalAirport})`;
  const long = l.durationMinutes >= 360 ? '· แวะพักนาน' : '';
  return `หยุดพักนาน ${duration(l.durationMinutes)}·${place}${long}${change ? ` · เปลี่ยนจาก ${l.arrivalAirport} ไปยัง ${l.departureAirport}` : ''}`;
}
export const legroomText = (cm: string | null) => cm ? (+cm < 76 ? `พื้นที่วางขาแคบกว่ามาตรฐาน (${cm} ซม.)` : `พื้นที่วางขาขนาดมาตรฐาน (${cm} ซม.)`) : null;
