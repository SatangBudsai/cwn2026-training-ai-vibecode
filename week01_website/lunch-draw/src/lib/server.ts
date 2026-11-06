import "server-only";
import { prisma } from "./db";
import { RECENT_DAYS, sumVotes } from "./odds";

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
  categories: string[];
  lastEatenAt: string | null;
};

export async function listRestaurants(): Promise<RestaurantDTO[]> {
  const since = new Date(Date.now() - RECENT_DAYS * 24 * 3600 * 1000);
  const [rows, eaten] = await Promise.all([
    prisma.restaurant.findMany({
      orderBy: { number: "asc" },
      include: { categories: { select: { categoryId: true } } },
    }),
    prisma.draw.groupBy({
      by: ["restaurantId"],
      where: { eatenAt: { gte: since } },
      _max: { eatenAt: true },
    }),
  ]);
  const last = new Map(eaten.map((e) => [e.restaurantId, e._max.eatenAt?.toISOString() ?? null]));
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    name: r.name,
    nameEn: r.nameEn,
    lat: r.lat,
    lon: r.lon,
    distance: r.distance,
    walkDistance: r.walkDistance,
    openingHours: r.openingHours,
    baseWeight: r.baseWeight,
    categories: r.categories.map((c) => c.categoryId),
    lastEatenAt: last.get(r.id) ?? null,
  }));
}

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { sort: "asc" }, select: { id: true, label: true } });
}

export async function roomState(code: string) {
  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      members: { orderBy: { createdAt: "asc" }, select: { id: true, nickname: true } },
      votes: { select: { memberId: true, categoryId: true, value: true } },
      draws: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, restaurantId: true, probability: true, createdAt: true, eatenAt: true },
      },
    },
  });
  if (!room) return null;
  return {
    code: room.code,
    lazyMode: room.lazyMode,
    members: room.members,
    votes: room.votes,
    scores: sumVotes(room.votes),
    latestDraw: room.draws[0] ?? null,
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
