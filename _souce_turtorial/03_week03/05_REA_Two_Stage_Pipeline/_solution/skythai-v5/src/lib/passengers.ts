// Passenger rules C1–C4 (shared by the UI and the booking API).
export interface Pax {
  adults: number;
  children: number;
  infantsSeat: number;
  infantsLap: number;
}

export const DEFAULT_PAX: Pax = { adults: 1, children: 0, infantsSeat: 0, infantsLap: 0 };
export const MAX_PAX = 9;

export function totalPax(p: Pax): number {
  return p.adults + p.children + p.infantsSeat + p.infantsLap;
}

/** Passengers that occupy a seat (lap infants do not). */
export function seatedPax(p: Pax): number {
  return p.adults + p.children + p.infantsSeat;
}

export function paxErrors(p: Pax): string[] {
  const errs: string[] = [];
  if (p.adults < 1) errs.push("ต้องมีผู้ใหญ่อย่างน้อย 1 คน"); // C1
  if (p.infantsLap > p.adults) // C2
    errs.push(`ต้องมีผู้ใหญ่อย่างน้อย 1 คนสำหรับการเดินทางพร้อมทารกที่นั่งบนตัก 1 คน`);
  if (totalPax(p) > MAX_PAX) errs.push(`ขออภัย เราไม่รองรับผู้โดยสารมากกว่า ${MAX_PAX} ท่าน`); // C3
  return errs;
}

function clampInt(v: unknown, min: number, max: number, dflt: number): number {
  const n = Number(v);
  if (!Number.isInteger(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

export function paxFromParams(sp: Record<string, string | undefined>): Pax {
  return {
    adults: clampInt(sp.adults, 1, 9, 1),
    children: clampInt(sp.children, 0, 9, 0),
    infantsSeat: clampInt(sp.infantsSeat, 0, 9, 0),
    infantsLap: clampInt(sp.infantsLap, 0, 9, 0),
  };
}

export function paxLabel(p: Pax): string {
  const parts = [`ผู้ใหญ่ ${p.adults}`];
  if (p.children) parts.push(`เด็ก ${p.children}`);
  if (p.infantsSeat) parts.push(`ทารก(มีที่นั่ง) ${p.infantsSeat}`);
  if (p.infantsLap) parts.push(`ทารก(บนตัก) ${p.infantsLap}`);
  return parts.join(" · ");
}

export const CABINS = [
  { id: "economy", label: "ชั้นประหยัด" },
  { id: "premium", label: "ประหยัดพรีเมียม" },
  { id: "business", label: "ชั้นธุรกิจ" },
  { id: "first", label: "ชั้นหนึ่ง" },
] as const;
export type CabinId = (typeof CABINS)[number]["id"];
export function cabinLabel(id: string): string {
  return CABINS.find((c) => c.id === id)?.label ?? "ชั้นประหยัด";
}
