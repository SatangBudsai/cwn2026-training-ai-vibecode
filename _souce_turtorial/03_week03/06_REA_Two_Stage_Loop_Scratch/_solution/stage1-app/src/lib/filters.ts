// สถานะตัวกรอง/การเรียง ↔ query string (ใช้ทั้งฝั่งหน้าและ API)
export type Filters = {
  stops: '' | '0' | '1' | '2';
  airlines: string[] | null;        // null = ทุกสายการบิน
  bags: number;
  maxPrice: number | null;
  depFrom: number; depTo: number; arrFrom: number; arrTo: number;
  lowEmissions: boolean;
  connects: string[] | null;        // null = ทุกสนามบิน
  layoverMin: number | null;        // นาที
  layoverMax: number | null;        // นาที
  hideSelfTransfer: boolean;
  maxDuration: number | null;       // ชั่วโมง
};
export type Sort = 'best' | 'price' | 'dep' | 'arr' | 'duration' | 'co2';
export const SORTS: [Sort, string][] = [
  ['best', 'เที่ยวบินยอดนิยม'], ['price', 'ราคา'], ['dep', 'เวลาออกเดินทาง'], ['arr', 'เวลาถึง'], ['duration', 'ระยะเวลา'], ['co2', 'การปล่อยก๊าซ'],
];
export const PRICE_STEP = 10000;
export const PRICE_ANY = 310000;
export const LAYOVER_MIN = 30, LAYOVER_MAX = 2010;

export function readFilters(q: URLSearchParams): Filters {
  const list = (k: string) => (q.has(k) ? q.get(k)!.split(',').filter(Boolean) : null);
  const num = (k: string, d: number) => (q.has(k) ? +q.get(k)! : d);
  return {
    stops: (q.get('stops') ?? '') as Filters['stops'],
    airlines: list('airlines'),
    bags: num('bags', 0),
    maxPrice: q.has('maxPrice') ? +q.get('maxPrice')! : null,
    depFrom: num('depFrom', 0), depTo: num('depTo', 24), arrFrom: num('arrFrom', 0), arrTo: num('arrTo', 24),
    lowEmissions: q.get('emissions') === 'low',
    connects: list('connects'),
    layoverMin: q.has('layoverMin') ? +q.get('layoverMin')! : null,
    layoverMax: q.has('layoverMax') ? +q.get('layoverMax')! : null,
    hideSelfTransfer: q.get('selfTransfer') === 'hide',
    maxDuration: q.has('maxDuration') ? +q.get('maxDuration')! : null,
  };
}

export function writeFilters(f: Filters, q: URLSearchParams) {
  const set = (k: string, v: string | null) => (v === null ? q.delete(k) : q.set(k, v));
  set('stops', f.stops || null);
  set('airlines', f.airlines ? f.airlines.join(',') : null);
  set('bags', f.bags ? String(f.bags) : null);
  set('maxPrice', f.maxPrice !== null ? String(f.maxPrice) : null);
  set('depFrom', f.depFrom ? String(f.depFrom) : null);
  set('depTo', f.depTo !== 24 ? String(f.depTo) : null);
  set('arrFrom', f.arrFrom ? String(f.arrFrom) : null);
  set('arrTo', f.arrTo !== 24 ? String(f.arrTo) : null);
  set('emissions', f.lowEmissions ? 'low' : null);
  set('connects', f.connects ? f.connects.join(',') : null);
  set('layoverMin', f.layoverMin !== null ? String(f.layoverMin) : null);
  set('layoverMax', f.layoverMax !== null ? String(f.layoverMax) : null);
  set('selfTransfer', f.hideSelfTransfer ? 'hide' : null);
  set('maxDuration', f.maxDuration !== null ? String(f.maxDuration) : null);
}

// หมวดที่ใช้อยู่ (นับใน "ตัวกรองทั้งหมด (N)" · C29)
export function activeGroups(f: Filters) {
  return {
    stops: !!f.stops,
    airlines: f.airlines !== null,
    bags: f.bags > 0,
    price: f.maxPrice !== null,
    times: f.depFrom > 0 || f.depTo < 24 || f.arrFrom > 0 || f.arrTo < 24,
    emissions: f.lowEmissions,
    connect: f.connects !== null || f.layoverMin !== null || f.layoverMax !== null,
    duration: f.maxDuration !== null,
    selfTransfer: f.hideSelfTransfer,
  };
}
export const anyActive = (f: Filters) => Object.values(activeGroups(f)).some(Boolean);
