import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { NumberTag, formatPercent } from "@/components/ui";

export const metadata = { title: "ประวัติ · ข้าวไหนดี" };

const fmt = new Intl.DateTimeFormat("th-TH", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});

async function getHistory() {
  await connection();
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const [recent, top] = await Promise.all([
    prisma.draw.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { room: { select: { code: true } }, restaurant: { select: { number: true, name: true } } },
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
  const champs = top.map((t) => ({ ...names.find((n) => n.id === t.restaurantId)!, wins: t._count._all }));
  return { recent, champs };
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="mt-4 h-96 rounded-2xl border border-line bg-card" />}>
      <History />
    </Suspense>
  );
}

async function History() {
  const { recent, champs } = await getHistory();
  const maxWins = champs[0]?.wins ?? 1;

  return (
    <div className="rise grid gap-6 pt-4 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-8">
      <section className="self-start rounded-2xl border border-line bg-card p-5">
        <h1 className="text-base font-medium">แชมป์ 7 วันล่าสุด</h1>
        {champs.length === 0 ? (
          <p className="mt-3 text-sm text-fg-3">ยังไม่มีผลจับสลาก</p>
        ) : (
          <ol className="mt-4 flex flex-col gap-3">
            {champs.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3">
                <NumberTag n={c.number} tone={i === 0 ? "win" : "default"} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{c.name}</div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-deep">
                    <div
                      className={`h-full rounded-full ${i === 0 ? "bg-ember" : "bg-fg-3/60"}`}
                      style={{ width: `${(c.wins / maxWins) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="w-12 text-right font-mono text-sm text-fg-2 tnum">{c.wins} ครั้ง</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="text-base font-medium">ผลจับสลากล่าสุด</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-fg-3">ยังไม่มีผลจับสลาก</p>
        ) : (
          <ol className="mt-3">
            {recent.map((d) => (
              <li key={d.id} className="flex min-h-12 items-center gap-3 border-b border-line py-2 last:border-0">
                <NumberTag n={d.restaurant.number} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{d.restaurant.name}</div>
                  <div className="text-xs text-fg-3">
                    {d.room ? `ห้อง ${d.room.code}` : "สุ่มคนเดียว"}
                    {d.lazyMode && " · ขี้เกียจเดิน"}
                    {d.eatenAt && <span className="text-ember-ink"> · ไปกินแล้ว</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs text-fg-2 tnum">{formatPercent(d.probability)}</div>
                  <div className="text-xs text-fg-3">{fmt.format(d.createdAt)}</div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
