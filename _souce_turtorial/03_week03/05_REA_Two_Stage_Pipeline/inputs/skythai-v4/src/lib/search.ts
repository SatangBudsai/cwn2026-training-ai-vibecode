import { addDays, defaultTravelDate, isValidISO, isSelectableDate, todayISO } from "./dates";
import { DEFAULT_PAX, paxFromParams, type Pax } from "./passengers";
import { airportsOf, parsePlaceIds, type Place } from "./places";

export type TripType = "oneway" | "roundtrip" | "multicity";
export type SortKey = "popular" | "price" | "depart" | "arrive" | "duration" | "emissions";

export interface SearchState {
  trip: TripType;
  from: string; // comma separated place ids
  to: string;
  date: string;
  ret: string;
  pax: Pax;
  cabin: string;
}

export const DEFAULT_SORT: SortKey = "popular"; // v3: same default as the source site ("เที่ยวบินยอดนิยม", B33)
export const RETURN_GAP_DAYS = 7;

export function defaultSearch(today = todayISO()): SearchState {
  // B1: the source site starts as a round trip; the return date defaults to one week after departure
  const date = defaultTravelDate(today);
  return { trip: "roundtrip", from: "BKK-CITY", to: "JP", date, ret: addDays(date, RETURN_GAP_DAYS), pax: DEFAULT_PAX, cabin: "economy" };
}

export type RawParams = Record<string, string | string[] | undefined>;
export function flat(sp: RawParams): Record<string, string | undefined> {
  const o: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) o[k] = Array.isArray(v) ? v[0] : v;
  return o;
}

export function parseSearch(raw: RawParams, today = todayISO()): SearchState {
  const sp = flat(raw);
  const d = defaultSearch(today);
  const trip = (["oneway", "roundtrip", "multicity"] as const).find((t) => t === sp.trip) ?? d.trip;
  const date = isValidISO(sp.date) ? sp.date : d.date;
  return {
    trip,
    from: sp.from ?? d.from,
    to: sp.to ?? d.to,
    date,
    ret: isValidISO(sp.ret) ? sp.ret : trip === "roundtrip" ? addDays(date, RETURN_GAP_DAYS) : "",
    pax: paxFromParams(sp),
    cabin: ["economy", "premium", "business", "first"].includes(sp.cabin ?? "") ? sp.cabin! : "economy",
  };
}

export function searchQuery(s: SearchState, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams({
    trip: s.trip, from: s.from, to: s.to, date: s.date, cabin: s.cabin,
    adults: String(s.pax.adults), children: String(s.pax.children),
    infantsSeat: String(s.pax.infantsSeat), infantsLap: String(s.pax.infantsLap), ...extra,
  });
  if (s.trip === "roundtrip" && s.ret) p.set("ret", s.ret);
  return p.toString();
}

/** C28 / C29 / C6 checks shared by the form and the results page. */
export function searchErrors(s: SearchState, today = todayISO()): string[] {
  const errs: string[] = [];
  const from: Place[] = parsePlaceIds(s.from);
  const to: Place[] = parsePlaceIds(s.to);
  if (from.length === 0) errs.push("กรุณาเลือกต้นทาง");
  if (to.length === 0) errs.push("กรุณาเลือกปลายทาง");
  if (from.length && to.length) {
    const a = new Set(airportsOf(from));
    if (airportsOf(to).some((x) => a.has(x))) errs.push("ต้นทางและปลายทางต้องไม่ใช่ที่เดียวกัน");
  }
  if (!isValidISO(s.date)) errs.push("กรุณาเลือกวันเดินทาง");
  else if (!isSelectableDate(s.date, today)) errs.push("เลือกวันที่ในอดีตหรือเกิน 1 ปีจากวันนี้ไม่ได้");
  if (s.trip === "roundtrip") {
    if (!isValidISO(s.ret)) errs.push("กรุณาเลือกวันขากลับ");
    else if (s.ret < s.date) errs.push("วันขากลับต้องไม่ก่อนวันขาไป");
  }
  return errs;
}
