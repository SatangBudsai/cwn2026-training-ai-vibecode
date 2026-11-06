// Pure odds logic, shared by the server (draw) and the client (odds board).

import { LAZY_RADIUS_M } from "./geo";

export type OddsRestaurant = {
  id: number;
  baseWeight: number;
  distance: number;
  walkDistance: number | null;
  categories: string[];
  disabled?: boolean;
  /** 1–4, null = unknown */
  priceLevel?: number | null;
  /** ISO time the team last ate here (within the penalty window), or null */
  lastEatenAt?: string | null;
};

/** Net vote per category, e.g. { noodle: 3, isan: -1 } */
export type CategoryScores = Record<string, number>;

export const VOTE_STEP = 0.5;
export const MIN_MULTIPLIER = 0.1;

// When the walking route is unknown, assume the walk is 30% longer than the straight line
export function walkMetres(r: Pick<OddsRestaurant, "distance" | "walkDistance">) {
  return r.walkDistance ?? Math.round(r.distance * 1.3);
}

export function categoryMultiplier(net: number) {
  return Math.max(MIN_MULTIPLIER, 1 + VOTE_STEP * net);
}

export const RECENT_DAYS = 7;
export const RECENT_FLOOR = 0.2;
const DAY_MS = 24 * 3600 * 1000;

/**
 * Places eaten at recently get less likely: x0.2 the same day,
 * climbing linearly back to x1 after RECENT_DAYS.
 */
export function recencyMultiplier(lastEatenAt: string | null | undefined, now: number) {
  if (!lastEatenAt) return 1;
  const t = Date.parse(lastEatenAt);
  if (Number.isNaN(t)) return 1;
  // a visit stamped a moment after `now` (clock skew, page loaded earlier) counts as today
  const days = Math.max(0, (now - t) / DAY_MS);
  if (days >= RECENT_DAYS) return 1;
  return RECENT_FLOOR + (1 - RECENT_FLOOR) * (days / RECENT_DAYS);
}

/**
 * A restaurant takes the multiplier of its best matching category:
 * if it serves anything the group wants, it gets the boost.
 */
export function restaurantWeight(r: OddsRestaurant, scores: CategoryScores, now = Date.now()) {
  if (r.baseWeight <= 0) return 0;
  const cats = r.categories.length ? r.categories : ["thai"];
  const mult = Math.max(...cats.map((c) => categoryMultiplier(scores[c] ?? 0)));
  return r.baseWeight * mult * recencyMultiplier(r.lastEatenAt, now);
}

export type Odd = { id: number; weight: number; p: number };

export const PRICE_LEVELS = [
  { level: 1, label: "฿", hint: "ไม่เกิน 60" },
  { level: 2, label: "฿฿", hint: "60–120" },
  { level: 3, label: "฿฿฿", hint: "120–250" },
  { level: 4, label: "฿฿฿฿", hint: "250 ขึ้นไป" },
] as const;
/** Price filter value for restaurants whose price nobody has set yet */
export const PRICE_UNKNOWN = 0;

export type DrawFilter = {
  lazy: boolean;
  /** Allowed price levels (0 = unknown). Empty = no price filter. */
  prices: number[];
};

export function matchesFilter(r: OddsRestaurant, f: DrawFilter) {
  if (r.disabled) return false;
  if (f.lazy && walkMetres(r) > LAZY_RADIUS_M) return false;
  if (f.prices.length && !f.prices.includes(r.priceLevel ?? PRICE_UNKNOWN)) return false;
  return true;
}

export function parsePrices(v: unknown): number[] {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  const ok = new Set<number>([PRICE_UNKNOWN, ...PRICE_LEVELS.map((p) => p.level)]);
  const nums = raw.filter((x) => x !== "" && x != null).map((x) => Number(x));
  return [...new Set(nums.filter((n) => ok.has(n)))].sort((a, b) => a - b);
}

export function computeOdds(
  list: OddsRestaurant[],
  scores: CategoryScores,
  filter: DrawFilter,
  now = Date.now(),
): Odd[] {
  const eligible = list.filter((r) => matchesFilter(r, filter));
  const weighted = eligible.map((r) => ({ id: r.id, weight: restaurantWeight(r, scores, now) }));
  const total = weighted.reduce((s, w) => s + w.weight, 0);
  return weighted
    .map((w) => ({ ...w, p: total > 0 ? w.weight / total : 0 }))
    .sort((a, b) => b.p - a.p || a.id - b.id);
}

/** Pick one entry; `rand` is a number in [0, 1). */
export function pick(odds: Odd[], rand: number): Odd | null {
  const live = odds.filter((o) => o.weight > 0);
  if (!live.length) return null;
  const total = live.reduce((s, o) => s + o.weight, 0);
  let x = rand * total;
  for (const o of live) {
    x -= o.weight;
    if (x < 0) return o;
  }
  return live[live.length - 1];
}

export function secureRandom() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

export function sumVotes(votes: { categoryId: string; value: number }[]): CategoryScores {
  const out: CategoryScores = {};
  for (const v of votes) out[v.categoryId] = (out[v.categoryId] ?? 0) + v.value;
  return out;
}
