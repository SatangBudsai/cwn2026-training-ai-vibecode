import "server-only";
import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { rename, writeFile } from "node:fs/promises";
import path from "node:path";

// File-based storage, no database.
// - data/restaurants.json : restaurants + the team's edits (committed to git)
// - data/state.json       : rooms, votes and draw history (runtime, gitignored)
// Everything lives in memory and is written back to disk on every change.
// Needs one long-running Node process (next dev / next start), not serverless.

export type Restaurant = {
  number: number; // id and the "เบอร์" on the odds board
  osmId: string;
  name: string;
  nameEn: string | null;
  lat: number;
  lon: number;
  cuisine: string;
  openingHours: string | null;
  distance: number;
  walkDistance: number | null;
  categories: string[];
  // team edits
  baseWeight?: number;
  nickname?: string | null;
  priceLevel?: number | null;
  disabled?: boolean;
};

export type Member = { id: string; nickname: string; createdAt: string };
export type Vote = { memberId: string; categoryId: string; value: number };
export type Room = {
  code: string;
  lazyMode: boolean;
  prices: number[];
  createdAt: string;
  updatedAt: string;
  members: Member[];
  votes: Vote[];
};
export type Draw = {
  id: string;
  roomCode: string | null;
  restaurantId: number;
  probability: number;
  lazyMode: boolean;
  createdAt: string;
  eatenAt: string | null;
};
type State = { rooms: Record<string, Room>; draws: Draw[] };

// e2e tests point this at their own copy so they never touch the real data
const DATA_DIR = process.env.LUNCH_DATA_DIR
  ? path.resolve(/*turbopackIgnore: true*/ process.env.LUNCH_DATA_DIR)
  : path.join(process.cwd(), "data");
const RESTAURANTS_FILE = path.join(DATA_DIR, "restaurants.json");
const STATE_FILE = path.join(DATA_DIR, "state.json");

const MAX_DRAWS = 1000;
const ROOM_TTL_MS = 3 * 24 * 3600 * 1000;

type Store = {
  restaurants: Restaurant[];
  restaurantsMtime: number;
  state: State;
  writes: Promise<unknown>;
  bus: EventEmitter;
};

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function mtime(file: string) {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

const g = globalThis as unknown as { __lunchStore?: Store };

function store(): Store {
  if (!g.__lunchStore) {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    const bus = new EventEmitter();
    bus.setMaxListeners(0);
    g.__lunchStore = {
      restaurants: readJson<Restaurant[]>(RESTAURANTS_FILE, []),
      restaurantsMtime: mtime(RESTAURANTS_FILE),
      state: { rooms: {}, draws: [], ...readJson<Partial<State>>(STATE_FILE, {}) },
      writes: Promise.resolve(),
      bus,
    };
  }
  const s = g.__lunchStore;
  // pick up changes made outside the app, e.g. git pull or `npm run data:fetch`
  const m = mtime(RESTAURANTS_FILE);
  if (m && m !== s.restaurantsMtime) {
    s.restaurants = readJson<Restaurant[]>(RESTAURANTS_FILE, s.restaurants);
    s.restaurantsMtime = m;
  }
  return s;
}

/** Write JSON atomically (temp file + rename), one write at a time. */
function persist(file: string, data: unknown) {
  const s = store();
  const body = JSON.stringify(data, null, 2) + "\n";
  s.writes = s.writes
    .then(async () => {
      const tmp = `${file}.${process.pid}.tmp`;
      await writeFile(tmp, body, "utf8");
      try {
        await rename(tmp, file);
      } catch {
        await writeFile(file, body, "utf8"); // Windows: target may be locked by an editor
      }
      if (file === RESTAURANTS_FILE) s.restaurantsMtime = mtime(file);
    })
    .catch((e) => console.error("[store] write failed", file, e));
  return s.writes;
}

// ---------- events (realtime) ----------

export type StoreEvent = { type: "restaurants" } | { type: "room"; code: string };

export function emit(e: StoreEvent) {
  store().bus.emit("change", e);
}

export function subscribe(fn: (e: StoreEvent) => void) {
  const bus = store().bus;
  bus.on("change", fn);
  return () => {
    bus.off("change", fn);
  };
}

// ---------- restaurants ----------

export function getRestaurants(): readonly Restaurant[] {
  return store().restaurants;
}

export async function updateRestaurant(number: number, patch: Partial<Restaurant>) {
  const s = store();
  const i = s.restaurants.findIndex((r) => r.number === number);
  if (i < 0) return null;
  s.restaurants = s.restaurants.map((r, j) => (j === i ? { ...r, ...patch } : r));
  await persist(RESTAURANTS_FILE, s.restaurants);
  emit({ type: "restaurants" });
  return s.restaurants[i];
}

// ---------- rooms ----------

function saveState() {
  const s = store();
  const cutoff = Date.now() - ROOM_TTL_MS;
  for (const [code, room] of Object.entries(s.state.rooms)) {
    if (Date.parse(room.updatedAt) < cutoff) delete s.state.rooms[code];
  }
  if (s.state.draws.length > MAX_DRAWS) s.state.draws = s.state.draws.slice(-MAX_DRAWS);
  return persist(STATE_FILE, s.state);
}

export function getRoom(code: string): Room | null {
  return store().state.rooms[code.toUpperCase()] ?? null;
}

export async function createRoom(room: Room) {
  store().state.rooms[room.code] = room;
  await saveState();
  return room;
}

/** Change a room in place, save, and notify everyone watching it */
export async function updateRoom(code: string, fn: (room: Room) => void) {
  const room = getRoom(code);
  if (!room) return null;
  fn(room);
  room.updatedAt = new Date().toISOString();
  await saveState();
  emit({ type: "room", code: room.code });
  return room;
}

// ---------- draws ----------

export function getDraws(): readonly Draw[] {
  return store().state.draws;
}

export async function addDraw(draw: Draw) {
  store().state.draws.push(draw);
  if (draw.roomCode) {
    const room = getRoom(draw.roomCode);
    if (room) room.updatedAt = draw.createdAt;
  }
  await saveState();
  if (draw.roomCode) emit({ type: "room", code: draw.roomCode });
  return draw;
}

export async function setEaten(id: string, eaten: boolean) {
  const d = store().state.draws.find((x) => x.id === id);
  if (!d) return null;
  d.eatenAt = eaten ? new Date().toISOString() : null;
  await saveState();
  emit({ type: "restaurants" }); // the 7-day penalty changed
  if (d.roomCode) emit({ type: "room", code: d.roomCode });
  return d;
}

// ---------- tests ----------

/** Test runs only: restore restaurants from restaurants.seed.json and clear rooms and draws */
export async function resetForTests() {
  const s = store();
  s.restaurants = readJson<Restaurant[]>(path.join(DATA_DIR, "restaurants.seed.json"), []);
  s.state = { rooms: {}, draws: [] };
  await persist(RESTAURANTS_FILE, s.restaurants);
  await persist(STATE_FILE, s.state);
  emit({ type: "restaurants" });
  return s.restaurants.length;
}

export function newId() {
  return crypto.randomUUID();
}
