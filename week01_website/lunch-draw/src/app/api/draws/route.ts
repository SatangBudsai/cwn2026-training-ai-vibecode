import { prisma } from "@/lib/db";

// Recent draws plus the most drawn restaurants of the last 7 days
export async function GET() {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const [recent, top] = await Promise.all([
    prisma.draw.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        probability: true,
        lazyMode: true,
        createdAt: true,
        room: { select: { code: true } },
        restaurant: { select: { id: true, number: true, name: true } },
      },
    }),
    prisma.draw.groupBy({
      by: ["restaurantId"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { restaurantId: "desc" } },
      take: 5,
    }),
  ]);
  const names = await prisma.restaurant.findMany({
    where: { id: { in: top.map((t) => t.restaurantId) } },
    select: { id: true, number: true, name: true },
  });
  const champions = top.map((t) => ({
    ...names.find((n) => n.id === t.restaurantId)!,
    wins: t._count._all,
  }));
  return Response.json({ recent, champions });
}
