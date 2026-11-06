import "server-only";
import { CATEGORIES } from "./categories";
import { RECENT_DAYS, sumVotes } from "./odds";
import { getDraws, getRestaurants, getRoom } from "./store";

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
  categories: string[];
  lastEatenAt: string | null;
};

export function listRestaurants(): RestaurantDTO[] {
  const since = Date.now() - RECENT_DAYS * 24 * 3600 * 1000;
  const lastEaten = new Map<number, string>();
  for (const d of getDraws()) {
    if (!d.eatenAt || Date.parse(d.eatenAt) < since) continue;
    const prev = lastEaten.get(d.restaurantId);
    if (!prev || prev < d.eatenAt) lastEaten.set(d.restaurantId, d.eatenAt);
  }
  return getRestaurants().map((r) => ({
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
    categories: r.categories,
    lastEatenAt: lastEaten.get(r.number) ?? null,
  }));
}

export function listCategories() {
  return CATEGORIES.map((c) => ({ id: c.id as string, label: c.label as string }));
}

export function roomState(code: string) {
  const room = getRoom(code);
  if (!room) return null;
  const latest = [...getDraws()].reverse().find((d) => d.roomCode === room.code) ?? null;
  return {
    code: room.code,
    lazyMode: room.lazyMode,
    prices: room.prices,
    members: room.members.map((m) => ({ id: m.id, nickname: m.nickname })),
    votes: room.votes,
    scores: sumVotes(room.votes),
    latestDraw: latest && {
      id: latest.id,
      restaurantId: latest.restaurantId,
      probability: latest.probability,
      createdAt: latest.createdAt,
      eatenAt: latest.eatenAt,
    },
  };
}

export type RoomState = NonNullable<ReturnType<typeof roomState>>;

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
