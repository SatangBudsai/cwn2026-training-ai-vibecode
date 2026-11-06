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

type VisitTag = "eaten" | "skipped" | "pending";
const PENDING_MS = 2 * 3600 * 1000;

const TAGS: Record<VisitTag, { label: string; className: string }> = {
  eaten: { label: "ไปกิน", className: "border-ember/50 bg-ember-soft text-ember-ink" },
  skipped: { label: "ไม่ได้ไปกิน", className: "border-line text-fg-3" },
  pending: { label: "รอยืนยัน", className: "border-line-strong text-fg-2" },
};

function VisitBadge({ tag }: { tag: VisitTag }) {
  const t = TAGS[tag];
  return (
    <span data-testid="visit-tag" data-tag={tag} className={`inline-flex h-6 shrink-0 items-center rounded-md border px-2 text-xs ${t.className}`}>
      {t.label}
    </span>
  );
}

async function getHistory() {
  await connection();
  const since = Date.now() - 7 * 24 * 3600 * 1000;
  const byNumber = new Map((await getRestaurants()).map((r) => [r.number, r]));
  const label = (n: number) => {
    const r = byNumber.get(n);
    return { number: n, name: r ? (r.nickname ?? r.name) : `ร้าน #${n}` };
  };
  const draws = await getDraws();
  const now = Date.now();

  // the newest draw of each room (or of solo use) may still be waiting for "ไปกินร้านนี้"
  const latestPerScope = new Set<string>();
  const seen = new Set<string>();
  for (const d of [...draws].reverse()) {
    const scope = d.roomCode ?? "solo";
    if (!seen.has(scope)) {
      seen.add(scope);
      latestPerScope.add(d.id);
    }
  }
  const tagOf = (d: (typeof draws)[number]): VisitTag => {
    if (d.eatenAt) return "eaten";
    const fresh = now - Date.parse(d.createdAt) < PENDING_MS;
    return fresh && latestPerScope.has(d.id) ? "pending" : "skipped";
  };

  const recent = [...draws]
    .reverse()
    .slice(0, 30)
    .map((d) => ({ ...d, createdAt: new Date(d.createdAt), restaurant: label(d.restaurantId), tag: tagOf(d) }));

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
        <h1 className="text-base font-medium">สุ่มได้บ่อยใน 7 วัน</h1>
        {champs.length === 0 ? (
          <p className="mt-3 text-sm text-fg-3">ยังไม่เคยสุ่ม</p>
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
        <h2 className="text-base font-medium">ผลการสุ่มล่าสุด</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-fg-3">ยังไม่เคยสุ่ม</p>
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
                  </div>
                </div>
                <VisitBadge tag={d.tag} />
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
