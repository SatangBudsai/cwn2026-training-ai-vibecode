import "server-only";
import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { CATEGORIES } from "./categories";

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
export type RestaurantVote = { memberId: string; restaurantId: number; value: number };
export type Room = {
  code: string;
  lazyMode: boolean;
  prices: number[];
  createdAt: string;
  updatedAt: string;
  members: Member[];
  votes: Vote[];
  /** votes for specific restaurants; missing in rooms saved before this existed */
  restaurantVotes?: RestaurantVote[];
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
const CATEGORIES_FILE = path.join(DATA_DIR, "categories.json");
const RATINGS_FILE = path.join(DATA_DIR, "ratings.json");

/** One person's cat rating (1–4) for one restaurant. `rater` is a random id kept in their browser. */
export type Rating = { restaurantId: number; rater: string; score: number; name: string | null; at: string };

export type Category = { id: string; label: string };
const DEFAULT_CATEGORIES: Category[] = CATEGORIES.map((c) => ({ id: c.id, label: c.label }));

const MAX_DRAWS = 1000;
const ROOM_TTL_MS = 3 * 24 * 3600 * 1000;

type Store = {
  restaurants: Restaurant[];
  categories: Category[];
  ratings: Rating[];
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
      categories: readJson<Category[]>(CATEGORIES_FILE, DEFAULT_CATEGORIES),
      ratings: readJson<Rating[]>(RATINGS_FILE, []),
      restaurantsMtime: mtime(RESTAURANTS_FILE),
      state: { rooms: {}, draws: [], ...readJson<Partial<State>>(STATE_FILE, {}) },
      writes: Promise.resolve(),
      bus,
    };
  }
  const s = g.__lunchStore;
  // a store created by older code survives dev hot reloads: fill in fields added since
  s.categories ??= readJson<Category[]>(CATEGORIES_FILE, DEFAULT_CATEGORIES);
  s.ratings ??= readJson<Rating[]>(RATINGS_FILE, []);
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

export type StoreEvent = { type: "restaurants" } | { type: "categories" } | { type: "room"; code: string };

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

export const MANUAL_PREFIX = "manual/";

/** Add a restaurant by hand. It gets the next free number. */
export async function addRestaurant(r: Omit<Restaurant, "number" | "osmId">) {
  const s = store();
  const number = Math.max(0, ...s.restaurants.map((x) => x.number)) + 1;
  const row: Restaurant = { number, osmId: `${MANUAL_PREFIX}${newId()}`, ...r };
  s.restaurants = [...s.restaurants, row];
  await persist(RESTAURANTS_FILE, s.restaurants);
  emit({ type: "restaurants" });
  return row;
}

/** Only restaurants added by hand can be deleted; OSM ones are disabled instead */
export async function deleteRestaurant(number: number): Promise<"ok" | "not-found" | "not-manual"> {
  const s = store();
  const r = s.restaurants.find((x) => x.number === number);
  if (!r) return "not-found";
  if (!r.osmId.startsWith(MANUAL_PREFIX)) return "not-manual";
  s.restaurants = s.restaurants.filter((x) => x.number !== number);
  await persist(RESTAURANTS_FILE, s.restaurants);
  emit({ type: "restaurants" });
  return "ok";
}

// ---------- food categories (data/categories.json, committed to git) ----------

export function getCategories(): readonly Category[] {
  return store().categories;
}

export async function addCategory(label: string) {
  const s = store();
  const c: Category = { id: `c-${newId().slice(0, 8)}`, label };
  s.categories = [...s.categories, c];
  await persist(CATEGORIES_FILE, s.categories);
  emit({ type: "categories" });
  return c;
}

export async function renameCategory(id: string, label: string) {
  const s = store();
  if (!s.categories.some((c) => c.id === id)) return null;
  s.categories = s.categories.map((c) => (c.id === id ? { ...c, label } : c));
  await persist(CATEGORIES_FILE, s.categories);
  emit({ type: "categories" });
  return s.categories.find((c) => c.id === id)!;
}

/** Remove a category everywhere: from the list, from every restaurant and from room votes */
export async function deleteCategory(id: string) {
  const s = store();
  if (!s.categories.some((c) => c.id === id)) return false;
  s.categories = s.categories.filter((c) => c.id !== id);
  s.restaurants = s.restaurants.map((r) =>
    r.categories.includes(id) ? { ...r, categories: r.categories.filter((c) => c !== id) } : r,
  );
  for (const room of Object.values(s.state.rooms)) room.votes = room.votes.filter((v) => v.categoryId !== id);
  await persist(CATEGORIES_FILE, s.categories);
  await persist(RESTAURANTS_FILE, s.restaurants);
  await persist(STATE_FILE, s.state);
  emit({ type: "categories" });
  emit({ type: "restaurants" });
  for (const code of Object.keys(s.state.rooms)) emit({ type: "room", code });
  return true;
}

// ---------- cat ratings (data/ratings.json, committed to git) ----------

export function getRatings(): readonly Rating[] {
  return store().ratings;
}

/** Set, change (score 1–4) or take back (score 0) one person's rating */
export async function setRating(restaurantId: number, rater: string, score: number, name: string | null) {
  const s = store();
  const rest = s.ratings.filter((x) => !(x.restaurantId === restaurantId && x.rater === rater));
  s.ratings = score ? [...rest, { restaurantId, rater, score, name, at: new Date().toISOString() }] : rest;
  await persist(RATINGS_FILE, s.ratings);
  emit({ type: "restaurants" });
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
  s.ratings = [];
  await persist(RATINGS_FILE, s.ratings);
  s.categories = readJson<Category[]>(path.join(DATA_DIR, "categories.seed.json"), DEFAULT_CATEGORIES);
  await persist(CATEGORIES_FILE, s.categories);
  emit({ type: "categories" });
  await persist(RESTAURANTS_FILE, s.restaurants);
  await persist(STATE_FILE, s.state);
  emit({ type: "restaurants" });
  return s.restaurants.length;
}

export function newId() {
  return crypto.randomUUID();
}
