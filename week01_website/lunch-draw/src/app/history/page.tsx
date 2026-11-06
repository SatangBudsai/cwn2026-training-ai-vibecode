import { Suspense } from "react";
import { connection } from "next/server";
import { getDraws, getRestaurants } from "@/lib/store";
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
  const since = Date.now() - 7 * 24 * 3600 * 1000;
  const byNumber = new Map(getRestaurants().map((r) => [r.number, r]));
  const label = (n: number) => {
    const r = byNumber.get(n);
    return { number: n, name: r ? (r.nickname ?? r.name) : `ร้าน #${n}` };
  };
  const draws = getDraws();

  const recent = [...draws]
    .reverse()
    .slice(0, 30)
    .map((d) => ({ ...d, createdAt: new Date(d.createdAt), restaurant: label(d.restaurantId) }));

  const wins = new Map<number, number>();
  for (const d of draws) {
    if (Date.parse(d.createdAt) >= since) wins.set(d.restaurantId, (wins.get(d.restaurantId) ?? 0) + 1);
  }
  const champs = [...wins.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, n]) => ({ id, ...label(id), wins: n }));
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
                    {d.roomCode ? `ห้อง ${d.roomCode}` : "สุ่มคนเดียว"}
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
