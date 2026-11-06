import "server-only";
import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";
import { CATEGORIES } from "./categories";

// Two storage modes, same functions:
//
// FILE (default, `npm run dev` / `next start` / e2e tests)
//   data/restaurants.json, categories.json, ratings.json (committed to git)
//   data/state.json (rooms, votes, draws; gitignored)
//   Kept in memory, written back on every change. Realtime with SSE (one process).
//
// REDIS (Vercel: KV_REST_API_URL + KV_REST_API_TOKEN from the Upstash integration)
//   Serverless has no lasting disk and many instances, so everything lives in Redis.
//   The first request copies data/*.json from the deploy into Redis; after that the
//   team's edits live in Redis (not in git). Pages poll /api/poll instead of SSE.

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
/** One person's cat rating (1–4) for one restaurant. `rater` is a random id kept in their browser. */
export type Rating = { restaurantId: number; rater: string; score: number; name: string | null; at: string };
export type Category = { id: string; label: string };
export type VoteTarget = { categoryId: string } | { restaurantId: number };

type State = { rooms: Record<string, Room>; draws: Draw[] };

const DEFAULT_CATEGORIES: Category[] = CATEGORIES.map((c) => ({ id: c.id, label: c.label }));
const MAX_DRAWS = 1000;
const ROOM_TTL_MS = 3 * 24 * 3600 * 1000;
export const MANUAL_PREFIX = "manual/";

// e2e tests point this at their own copy so they never touch the real data
const DATA_DIR = process.env.LUNCH_DATA_DIR
  ? path.resolve(/*turbopackIgnore: true*/ process.env.LUNCH_DATA_DIR)
  : path.join(process.cwd(), "data");
const RESTAURANTS_FILE = path.join(DATA_DIR, "restaurants.json");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const CATEGORIES_FILE = path.join(DATA_DIR, "categories.json");
const RATINGS_FILE = path.join(DATA_DIR, "ratings.json");

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function newId() {
  return crypto.randomUUID();
}

// =====================================================================================
// mode
// =====================================================================================

const REDIS_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export type StorageMode = "file" | "redis";
/** LUNCH_STORAGE=file forces file mode even when Redis variables exist */
export const storageMode: StorageMode =
  process.env.LUNCH_STORAGE !== "file" && REDIS_URL && REDIS_TOKEN ? "redis" : "file";

// =====================================================================================
// FILE backend
// =====================================================================================

type FileStore = {
  restaurants: Restaurant[];
  categories: Category[];
  ratings: Rating[];
  restaurantsMtime: number;
  state: State;
  writes: Promise<unknown>;
  bus: EventEmitter;
};

function mtime(file: string) {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

const g = globalThis as unknown as { __lunchStore?: FileStore; __lunchRedis?: Redis };

function fileStore(): FileStore {
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
  const s = fileStore();
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

function saveState() {
  const s = fileStore();
  const cutoff = Date.now() - ROOM_TTL_MS;
  for (const [code, room] of Object.entries(s.state.rooms)) {
    if (Date.parse(room.updatedAt) < cutoff) delete s.state.rooms[code];
  }
  if (s.state.draws.length > MAX_DRAWS) s.state.draws = s.state.draws.slice(-MAX_DRAWS);
  return persist(STATE_FILE, s.state);
}

// =====================================================================================
// REDIS backend
// =====================================================================================

const K = {
  restaurants: "ld:restaurants", // JSON array
  categories: "ld:categories", // JSON array
  ratings: "ld:ratings", // hash  "<restaurantId>|<rater>" -> Rating
  draws: "ld:draws", // list of Draw, oldest first
  version: "ld:version", // bumped when restaurants / categories / ratings / eaten change
  room: (c: string) => `ld:room:${c}`, // JSON meta (code, lazyMode, prices, dates)
  members: (c: string) => `ld:room:${c}:members`, // hash memberId -> Member
  votes: (c: string) => `ld:room:${c}:votes`, // hash "<memberId>|c|<categoryId>" or "<memberId>|r|<restaurantId>" -> value
};
const ROOM_TTL_S = ROOM_TTL_MS / 1000;

function redis() {
  g.__lunchRedis ??= new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! });
  return g.__lunchRedis;
}

/** First use after a deploy: copy the restaurant list and categories from the bundle */
async function seeded<T>(key: string, file: string, fallback: T): Promise<T> {
  const r = redis();
  const v = await r.get<T>(key);
  if (v != null) return v;
  const fromBundle = readJson<T>(file, fallback);
  await r.set(key, fromBundle, { nx: true });
  return (await r.get<T>(key)) ?? fromBundle;
}

const bump = () => redis().incr(K.version);

type RoomMeta = Pick<Room, "code" | "lazyMode" | "prices" | "createdAt" | "updatedAt">;

async function touchRoom(code: string) {
  const r = redis();
  const meta = await r.get<RoomMeta>(K.room(code));
  if (!meta) return false;
  const p = r.pipeline();
  p.set(K.room(code), { ...meta, updatedAt: new Date().toISOString() }, { ex: ROOM_TTL_S });
  p.expire(K.members(code), ROOM_TTL_S);
  p.expire(K.votes(code), ROOM_TTL_S);
  await p.exec();
  return true;
}

// =====================================================================================
// events (realtime): SSE in file mode, a version number to poll in Redis mode
// =====================================================================================

export type StoreEvent = { type: "restaurants" } | { type: "categories" } | { type: "room"; code: string };

export function emit(e: StoreEvent) {
  if (storageMode === "file") fileStore().bus.emit("change", e);
}

export function subscribe(fn: (e: StoreEvent) => void) {
  const bus = fileStore().bus;
  bus.on("change", fn);
  return () => {
    bus.off("change", fn);
  };
}

/** Redis mode: changes whenever restaurant data changes, so pollers know when to refetch */
export async function dataVersion(): Promise<number> {
  if (storageMode === "file") return 0;
  return (await redis().get<number>(K.version)) ?? 0;
}

// =====================================================================================
// restaurants
// =====================================================================================

export async function getRestaurants(): Promise<Restaurant[]> {
  if (storageMode === "file") return fileStore().restaurants;
  return seeded<Restaurant[]>(K.restaurants, RESTAURANTS_FILE, []);
}

async function saveRestaurants(list: Restaurant[]) {
  if (storageMode === "file") {
    fileStore().restaurants = list;
    await persist(RESTAURANTS_FILE, list);
  } else {
    await redis().set(K.restaurants, list);
    await bump();
  }
  emit({ type: "restaurants" });
}

export async function updateRestaurant(number: number, patch: Partial<Restaurant>) {
  const list = await getRestaurants();
  const i = list.findIndex((r) => r.number === number);
  if (i < 0) return null;
  const next = list.map((r, j) => (j === i ? { ...r, ...patch } : r));
  await saveRestaurants(next);
  return next[i];
}

/** Add a restaurant by hand. It gets the next free number. */
export async function addRestaurant(r: Omit<Restaurant, "number" | "osmId">) {
  const list = await getRestaurants();
  const number = Math.max(0, ...list.map((x) => x.number)) + 1;
  const row: Restaurant = { number, osmId: `${MANUAL_PREFIX}${newId()}`, ...r };
  await saveRestaurants([...list, row]);
  return row;
}

/** Only restaurants added by hand can be deleted; OSM ones are disabled instead */
export async function deleteRestaurant(number: number): Promise<"ok" | "not-found" | "not-manual"> {
  const list = await getRestaurants();
  const r = list.find((x) => x.number === number);
  if (!r) return "not-found";
  if (!r.osmId.startsWith(MANUAL_PREFIX)) return "not-manual";
  await saveRestaurants(list.filter((x) => x.number !== number));
  return "ok";
}

// =====================================================================================
// food categories
// =====================================================================================

export async function getCategories(): Promise<Category[]> {
  if (storageMode === "file") return fileStore().categories;
  return seeded<Category[]>(K.categories, CATEGORIES_FILE, DEFAULT_CATEGORIES);
}

async function saveCategories(list: Category[]) {
  if (storageMode === "file") {
    fileStore().categories = list;
    await persist(CATEGORIES_FILE, list);
  } else {
    await redis().set(K.categories, list);
    await bump();
  }
  emit({ type: "categories" });
}

export async function addCategory(label: string) {
  const c: Category = { id: `c-${newId().slice(0, 8)}`, label };
  await saveCategories([...(await getCategories()), c]);
  return c;
}

export async function renameCategory(id: string, label: string) {
  const list = await getCategories();
  if (!list.some((c) => c.id === id)) return null;
  const next = list.map((c) => (c.id === id ? { ...c, label } : c));
  await saveCategories(next);
  return next.find((c) => c.id === id)!;
}

/** Remove a category everywhere: from the list, from every restaurant and from room votes */
export async function deleteCategory(id: string) {
  const list = await getCategories();
  if (!list.some((c) => c.id === id)) return false;
  await saveCategories(list.filter((c) => c.id !== id));
  const rs = await getRestaurants();
  await saveRestaurants(rs.map((r) => (r.categories.includes(id) ? { ...r, categories: r.categories.filter((c) => c !== id) } : r)));
  if (storageMode === "file") {
    const s = fileStore();
    for (const room of Object.values(s.state.rooms)) room.votes = room.votes.filter((v) => v.categoryId !== id);
    await saveState();
    for (const code of Object.keys(s.state.rooms)) emit({ type: "room", code });
  }
  // Redis: votes for a deleted category stay in their (short-lived) room but match no restaurant
  return true;
}

// =====================================================================================
// cat ratings
// =====================================================================================

export async function getRatings(): Promise<Rating[]> {
  if (storageMode === "file") return fileStore().ratings;
  const all = await redis().hgetall<Record<string, Rating>>(K.ratings);
  return all ? Object.values(all) : [];
}

/** Set, change (score 1–4) or take back (score 0) one person's rating */
export async function setRating(restaurantId: number, rater: string, score: number, name: string | null) {
  const rating: Rating = { restaurantId, rater, score, name, at: new Date().toISOString() };
  if (storageMode === "file") {
    const s = fileStore();
    const rest = s.ratings.filter((x) => !(x.restaurantId === restaurantId && x.rater === rater));
    s.ratings = score ? [...rest, rating] : rest;
    await persist(RATINGS_FILE, s.ratings);
  } else {
    const field = `${restaurantId}|${rater}`;
    if (score) await redis().hset(K.ratings, { [field]: rating });
    else await redis().hdel(K.ratings, field);
    await bump();
  }
  emit({ type: "restaurants" });
}

// =====================================================================================
// rooms
// =====================================================================================

export async function getRoom(code: string): Promise<Room | null> {
  code = code.toUpperCase();
  if (storageMode === "file") return fileStore().state.rooms[code] ?? null;
  const r = redis();
  const [meta, members, votes] = await Promise.all([
    r.get<RoomMeta>(K.room(code)),
    r.hgetall<Record<string, Member>>(K.members(code)),
    r.hgetall<Record<string, number | string>>(K.votes(code)),
  ]);
  if (!meta) return null;
  const v: Vote[] = [];
  const rv: RestaurantVote[] = [];
  for (const [field, raw] of Object.entries(votes ?? {})) {
    const [memberId, kind, target] = field.split("|");
    const value = Number(raw);
    if (kind === "c") v.push({ memberId, categoryId: target, value });
    else rv.push({ memberId, restaurantId: Number(target), value });
  }
  const list = Object.values(members ?? {}).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { ...meta, members: list, votes: v, restaurantVotes: rv };
}

export async function createRoom(room: Room) {
  if (storageMode === "file") {
    fileStore().state.rooms[room.code] = room;
    await saveState();
  } else {
    const meta: RoomMeta = {
      code: room.code,
      lazyMode: room.lazyMode,
      prices: room.prices,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
    await redis().set(K.room(room.code), meta, { ex: ROOM_TTL_S });
  }
  return room;
}

/** File mode: change a room in place, save, and notify everyone watching it */
async function updateFileRoom(code: string, fn: (room: Room) => void) {
  const room = fileStore().state.rooms[code.toUpperCase()];
  if (!room) return null;
  fn(room);
  room.updatedAt = new Date().toISOString();
  await saveState();
  emit({ type: "room", code: room.code });
  return room;
}

/** Join a room. Joining again with the same nickname returns the same member. */
export async function addMember(code: string, nickname: string): Promise<Member | null> {
  code = code.toUpperCase();
  if (storageMode === "file") {
    let member: Member | undefined;
    const room = await updateFileRoom(code, (r) => {
      member = r.members.find((m) => m.nickname === nickname);
      if (!member) {
        member = { id: newId(), nickname, createdAt: new Date().toISOString() };
        r.members.push(member);
      }
    });
    return room ? member! : null;
  }
  const r = redis();
  if (!(await touchRoom(code))) return null;
  const existing = Object.values((await r.hgetall<Record<string, Member>>(K.members(code))) ?? {}).find(
    (m) => m.nickname === nickname,
  );
  if (existing) return existing;
  const member: Member = { id: newId(), nickname, createdAt: new Date().toISOString() };
  await r.hset(K.members(code), { [member.id]: member });
  return member;
}

/** One member's vote (−1, 0 removes, +1) for a category or a restaurant */
export async function setVote(code: string, memberId: string, target: VoteTarget, value: number) {
  code = code.toUpperCase();
  if (storageMode === "file") {
    return !!(await updateFileRoom(code, (r) => {
      if ("restaurantId" in target) {
        const rest = (r.restaurantVotes ?? []).filter((v) => !(v.memberId === memberId && v.restaurantId === target.restaurantId));
        r.restaurantVotes = value === 0 ? rest : [...rest, { memberId, restaurantId: target.restaurantId, value }];
      } else {
        r.votes = r.votes.filter((v) => !(v.memberId === memberId && v.categoryId === target.categoryId));
        if (value !== 0) r.votes.push({ memberId, categoryId: target.categoryId, value });
      }
    }));
  }
  // one field per member and target: two people voting at once never overwrite each other
  const field = "restaurantId" in target ? `${memberId}|r|${target.restaurantId}` : `${memberId}|c|${target.categoryId}`;
  if (value === 0) await redis().hdel(K.votes(code), field);
  else await redis().hset(K.votes(code), { [field]: value });
  return touchRoom(code);
}

/** Shared filters of a room */
export async function setRoomFilters(code: string, f: { lazyMode?: boolean; prices?: number[] }) {
  code = code.toUpperCase();
  if (storageMode === "file") {
    return !!(await updateFileRoom(code, (r) => {
      if (f.lazyMode !== undefined) r.lazyMode = f.lazyMode;
      if (f.prices !== undefined) r.prices = f.prices;
    }));
  }
  const r = redis();
  const meta = await r.get<RoomMeta>(K.room(code));
  if (!meta) return false;
  await r.set(K.room(code), { ...meta, ...f, updatedAt: new Date().toISOString() }, { ex: ROOM_TTL_S });
  return true;
}

// =====================================================================================
// draws
// =====================================================================================

export async function getDraws(): Promise<Draw[]> {
  if (storageMode === "file") return fileStore().state.draws;
  return (await redis().lrange<Draw>(K.draws, 0, -1)) ?? [];
}

export async function addDraw(draw: Draw) {
  if (storageMode === "file") {
    const s = fileStore();
    s.state.draws.push(draw);
    if (draw.roomCode) {
      const room = s.state.rooms[draw.roomCode];
      if (room) room.updatedAt = draw.createdAt;
    }
    await saveState();
    if (draw.roomCode) emit({ type: "room", code: draw.roomCode });
  } else {
    const p = redis().pipeline();
    p.rpush(K.draws, draw);
    p.ltrim(K.draws, -MAX_DRAWS, -1);
    await p.exec();
    if (draw.roomCode) await touchRoom(draw.roomCode);
  }
  return draw;
}

export async function setEaten(id: string, eaten: boolean) {
  const eatenAt = eaten ? new Date().toISOString() : null;
  if (storageMode === "file") {
    const d = fileStore().state.draws.find((x) => x.id === id);
    if (!d) return null;
    d.eatenAt = eatenAt;
    await saveState();
    emit({ type: "restaurants" }); // the 7-day penalty changed
    if (d.roomCode) emit({ type: "room", code: d.roomCode });
    return d;
  }
  const draws = await getDraws();
  const i = draws.findIndex((x) => x.id === id);
  if (i < 0) return null;
  const d = { ...draws[i], eatenAt };
  await redis().lset(K.draws, i, d);
  await bump();
  return d;
}

// =====================================================================================
// tests (file mode only)
// =====================================================================================

/** Test runs only: restore restaurants from restaurants.seed.json and clear rooms, draws and ratings */
export async function resetForTests() {
  if (storageMode !== "file") throw new Error("reset is for file mode test runs only");
  const s = fileStore();
  s.restaurants = readJson<Restaurant[]>(path.join(DATA_DIR, "restaurants.seed.json"), []);
  s.state = { rooms: {}, draws: [] };
  s.ratings = [];
  s.categories = readJson<Category[]>(path.join(DATA_DIR, "categories.seed.json"), DEFAULT_CATEGORIES);
  await persist(RATINGS_FILE, s.ratings);
  await persist(CATEGORIES_FILE, s.categories);
  await persist(RESTAURANTS_FILE, s.restaurants);
  await persist(STATE_FILE, s.state);
  emit({ type: "categories" });
  emit({ type: "restaurants" });
  return s.restaurants.length;
}
