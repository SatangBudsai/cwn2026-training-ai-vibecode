import "server-only";
import { RECENT_DAYS, sumRestaurantVotes, sumVotes } from "./odds";
import { MANUAL_PREFIX, getCategories, getDraws, getRatings, getRestaurants, getRoom, storageMode } from "./store";

export type RestaurantDTO = {
  id: number;
  number: number;
  name: string;
  nameEn: string | null;
  lat: number;
  lon: number;
  distance: number;
  walkDistance: number | null;
  openingHours: string | null;
  baseWeight: number;
  nickname: string | null;
  priceLevel: number | null;
  disabled: boolean;
  /** added by hand in the app (can be deleted), not from OpenStreetMap */
  manual: boolean;
  categories: string[];
  lastEatenAt: string | null;
  /** cat ratings: average 1–4 (null = none yet), how many people, and each rater's score */
  ratingAvg: number | null;
  ratingCount: number;
  ratings: Record<string, number>;
};

export async function listRestaurants(): Promise<RestaurantDTO[]> {
  const since = Date.now() - RECENT_DAYS * 24 * 3600 * 1000;
  const lastEaten = new Map<number, string>();
  const [draws, ratingRows, restaurants] = await Promise.all([getDraws(), getRatings(), getRestaurants()]);
  for (const d of draws) {
    if (!d.eatenAt || Date.parse(d.eatenAt) < since) continue;
    const prev = lastEaten.get(d.restaurantId);
    if (!prev || prev < d.eatenAt) lastEaten.set(d.restaurantId, d.eatenAt);
  }
  const byPlace = new Map<number, Record<string, number>>();
  for (const x of ratingRows) {
    const m = byPlace.get(x.restaurantId) ?? {};
    m[x.rater] = x.score;
    byPlace.set(x.restaurantId, m);
  }
  return restaurants.map((r) => {
    const ratings = byPlace.get(r.number) ?? {};
    const scores = Object.values(ratings);
    return {
    id: r.number,
    number: r.number,
    name: r.name,
    nameEn: r.nameEn,
    lat: r.lat,
    lon: r.lon,
    distance: r.distance,
    walkDistance: r.walkDistance,
    openingHours: r.openingHours,
    baseWeight: r.baseWeight ?? 1,
    nickname: r.nickname ?? null,
    priceLevel: r.priceLevel ?? null,
    disabled: r.disabled ?? false,
    manual: r.osmId.startsWith(MANUAL_PREFIX),
    categories: r.categories,
    lastEatenAt: lastEaten.get(r.number) ?? null,
    ratingAvg: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : null,
    ratingCount: scores.length,
    ratings,
    };
  });
}

/** Food categories with how many restaurants (not disabled) have each */
export async function listCategories() {
  const [restaurants, categories] = await Promise.all([getRestaurants(), getCategories()]);
  const counts = new Map<string, number>();
  for (const r of restaurants) {
    if (r.disabled) continue;
    for (const c of r.categories) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return categories.map((c) => ({ id: c.id, label: c.label, restaurants: counts.get(c.id) ?? 0 }));
}

export type CategoryDTO = Awaited<ReturnType<typeof listCategories>>[number];

export async function isCategory(id: unknown): Promise<boolean> {
  return typeof id === "string" && (await getCategories()).some((c) => c.id === id);
}

export async function roomState(code: string) {
  const room = await getRoom(code);
  if (!room) return null;
  const latest = [...(await getDraws())].reverse().find((d) => d.roomCode === room.code) ?? null;
  return {
    code: room.code,
    lazyMode: room.lazyMode,
    prices: room.prices,
    members: room.members.map((m) => ({ id: m.id, nickname: m.nickname })),
    votes: room.votes,
    scores: sumVotes(room.votes),
    restaurantVotes: room.restaurantVotes ?? [],
    restaurantScores: sumRestaurantVotes(room.restaurantVotes ?? []),
    latestDraw: latest && {
      id: latest.id,
      restaurantId: latest.restaurantId,
      probability: latest.probability,
      createdAt: latest.createdAt,
      eatenAt: latest.eatenAt,
    },
  };
}

export type RoomState = NonNullable<Awaited<ReturnType<typeof roomState>>>;

// No 0/O/1/I so codes are easy to read out loud
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newRoomCode() {
  const buf = new Uint32Array(4);
  crypto.getRandomValues(buf);
  return [...buf].map((n) => ALPHABET[n % ALPHABET.length]).join("");
}

export function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

/** How pages get live updates: SSE with one Node process (file mode), polling on Vercel (Redis) */
export type RealtimeMode = "sse" | "poll";
export function realtimeMode(): RealtimeMode {
  return storageMode === "redis" ? "poll" : "sse";
}
