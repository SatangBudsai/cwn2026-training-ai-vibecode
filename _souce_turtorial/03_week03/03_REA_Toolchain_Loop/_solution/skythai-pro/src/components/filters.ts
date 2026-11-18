import type { FlightView } from "@/lib/types";

export interface Filters {
  stops: "any" | "0" | "1" | "2";
  airlines: string[] | null;     // null = all airlines
  bags: number;                  // carry-on bags (no per-flight data in the mock)
  maxPrice: number | null;
  dep: [number, number];         // hours, 0..24
  arr: [number, number];
  emissions: "all" | "low";
  layoverMax: number | null;     // minutes
  connecting: string[] | null;   // null = all connecting airports
  maxDurationH: number | null;
  showSelfTransfer: boolean;     // no self-transfer itineraries exist in the mock data
}

export const EMPTY_FILTERS: Filters = {
  stops: "any", airlines: null, bags: 0, maxPrice: null, dep: [0, 24], arr: [0, 24],
  emissions: "all", layoverMax: null, connecting: null, maxDurationH: null, showSelfTransfer: true,
};

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const inHours = (t: string, [a, b]: [number, number]) => mins(t) >= a * 60 && mins(t) < b * 60;

/** All filters are combined with AND (C13). `total` is the displayed price for the selected passengers. */
export function passes(f: FlightView, x: Filters, total: (p: number) => number): boolean {
  if (x.stops !== "any" && f.stops > Number(x.stops)) return false;
  if (x.airlines && !f.airlines.every((a) => x.airlines!.includes(a.code))) return false; // C15
  if (x.maxPrice !== null && total(f.price) > x.maxPrice) return false;
  if (!inHours(f.departTime, x.dep) || !inHours(f.arriveTime, x.arr)) return false;
  if (x.emissions === "low" && f.co2.level !== 1) return false;
  if (x.layoverMax !== null && f.layovers.some((l) => l.durationMin > x.layoverMax!)) return false;
  if (x.connecting && f.layovers.some((l) => !x.connecting!.includes(l.airport))) return false; // C16: nonstop still passes
  if (x.maxDurationH !== null && f.durationMin > x.maxDurationH * 60) return false;
  return true;
}

export function activeCount(x: Filters): number {
  let n = 0;
  if (x.stops !== "any") n++;
  if (x.airlines) n++;
  if (x.bags > 0) n++;
  if (x.maxPrice !== null) n++;
  if (x.dep[0] !== 0 || x.dep[1] !== 24 || x.arr[0] !== 0 || x.arr[1] !== 24) n++;
  if (x.emissions !== "all") n++;
  if (x.layoverMax !== null || x.connecting) n++;
  if (x.maxDurationH !== null) n++;
  if (!x.showSelfTransfer) n++;
  return n;
}
