"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Footprints, List, Map as MapIcon, MapPin, Navigation, Users, UtensilsCrossed } from "lucide-react";
import {
  computeOdds,
  sumRestaurantVotes,
  walkMetres,
  type CategoryScores,
  type DrawFilter,
  type Odd,
  type RestaurantScores,
} from "@/lib/odds";
import { googleDirectionsUrl, googleMapsUrl, LAZY_RADIUS_M } from "@/lib/geo";
import type { RestaurantDTO, RoomState } from "@/lib/server";
import { CategoryVotes, type Category } from "./category-votes";
import { OddsBoard } from "./odds-board";
import { OddsMap } from "./odds-map";
import { WalkMap } from "./walk-map";
import { RatingPicker } from "./rating";
import { PriceFilter } from "./price-filter";
import { Button, NumberTag, displayName, formatMetres, formatPercent, priceLabel, walkMinutes } from "./ui";

type Draw = {
  id: string;
  restaurantId: number;
  probability: number;
  createdAt: string | Date;
  eatenAt: string | Date | null;
};

export type RestaurantPatch = Partial<
  Pick<RestaurantDTO, "baseWeight" | "categories" | "nickname" | "priceLevel" | "disabled">
>;

type Props = {
  restaurants: RestaurantDTO[];
  categories: Category[];
  room?: RoomState & { code: string };
};

const SOLO_KEY = "lunch-draw:solo";
const RATER_KEY = "lunch-draw:rater";
type SoloState = { votes?: CategoryScores; lazy?: boolean; prices?: number[]; picks?: RestaurantScores };
const memberKey = (code: string) => `lunch-draw:member:${code}`;

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeStore(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode: fine */
  }
}

export function LunchApp({ restaurants: initialRestaurants, categories: initialCategories, room: initialRoom }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const router = useRouter();
  const isRoom = Boolean(initialRoom);
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [room, setRoom] = useState(initialRoom);
  const [member, setMember] = useState<{ id: string; nickname: string } | null>(null);
  const [rater, setRater] = useState<string | null>(null); // this browser's id for cat ratings

  // solo state (kept in this browser)
  const [soloVotes, setSoloVotes] = useState<CategoryScores>({});
  const [soloLazy, setSoloLazy] = useState(false);
  const [soloPrices, setSoloPrices] = useState<number[]>([]);
  const [soloPicks, setSoloPicks] = useState<RestaurantScores>({});

  const [showAll, setShowAll] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [draw, setDraw] = useState<Draw | null>((initialRoom?.latestDraw as Draw | null) ?? null);
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seenDraw = useRef<string | null>(initialRoom?.latestDraw?.id ?? null);

  // Time used for the 7-day "recently eaten" penalty; fixed per page view
  const [now, setNow] = useState(() => Date.now());

  // Restore this browser's state after mount (localStorage is not available on the server)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    let id = readStore<string | null>(RATER_KEY, null);
    if (!id) {
      id = crypto.randomUUID();
      writeStore(RATER_KEY, id);
    }
    setRater(id);
    if (isRoom && initialRoom) {
      const m = readStore<{ id: string; nickname: string } | null>(memberKey(initialRoom.code), null);
      // only trust a stored member that still exists in this room
      if (m && initialRoom.members.some((x) => x.id === m.id)) setMember(m);
    } else {
      const s = readStore<SoloState>(SOLO_KEY, {});
      setSoloVotes(s.votes ?? {});
      setSoloLazy(Boolean(s.lazy));
      setSoloPrices(Array.isArray(s.prices) ? s.prices : []);
      setSoloPicks(s.picks && typeof s.picks === "object" ? s.picks : {});
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isRoom, initialRoom]);

  const byId = useMemo(() => new Map(restaurants.map((r) => [r.id, r])), [restaurants]);
  const lazy = isRoom ? Boolean(room?.lazyMode) : soloLazy;
  const roomPrices = room?.prices;
  const prices = useMemo(() => (isRoom ? (roomPrices ?? []) : soloPrices), [isRoom, roomPrices, soloPrices]);
  const filter: DrawFilter = useMemo(() => ({ lazy, prices }), [lazy, prices]);
  const saveSolo = (next: SoloState) =>
    writeStore(SOLO_KEY, { votes: soloVotes, lazy: soloLazy, prices: soloPrices, picks: soloPicks, ...next });
  const roomScores = room?.scores;
  const scores: CategoryScores = useMemo(
    () => (isRoom ? (roomScores ?? {}) : soloVotes),
    [isRoom, roomScores, soloVotes],
  );
  const myVotes: Record<string, number> = useMemo(() => {
    if (!isRoom) return soloVotes;
    const out: Record<string, number> = {};
    room?.votes.filter((v) => v.memberId === member?.id).forEach((v) => (out[v.categoryId] = v.value));
    return out;
  }, [isRoom, soloVotes, room, member]);

  const roomPicks = room?.restaurantScores;
  const picks: RestaurantScores = useMemo(
    () => (isRoom ? (roomPicks ?? {}) : soloPicks),
    [isRoom, roomPicks, soloPicks],
  );
  const myPicks: RestaurantScores = useMemo(() => {
    if (!isRoom) return soloPicks;
    const out: RestaurantScores = {};
    room?.restaurantVotes.filter((v) => v.memberId === member?.id).forEach((v) => (out[v.restaurantId] = v.value));
    return out;
  }, [isRoom, soloPicks, room, member]);

  const odds = useMemo(
    () => computeOdds(restaurants, scores, filter, now, picks),
    [restaurants, scores, filter, now, picks],
  );
  const pool = useMemo(() => odds.map((o) => byId.get(o.id)!).filter(Boolean), [odds, byId]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    pool.forEach((r) => r.categories.forEach((x) => (c[x] = (c[x] ?? 0) + 1)));
    return c;
  }, [pool]);
  const voters = useMemo(() => {
    if (!room) return undefined;
    const names = new Map(room.members.map((m) => [m.id, m.nickname]));
    const out: Record<string, { up: string[]; down: string[] }> = {};
    room.votes.forEach((v) => {
      const e = (out[v.categoryId] ??= { up: [], down: [] });
      (v.value > 0 ? e.up : e.down).push(names.get(v.memberId) ?? "?");
    });
    return out;
  }, [room]);
  const pickVoters = useMemo(() => {
    if (!room) return undefined;
    const names = new Map(room.members.map((m) => [m.id, m.nickname]));
    const out: Record<number, { up: string[]; down: string[] }> = {};
    room.restaurantVotes.forEach((v) => {
      const e = (out[v.restaurantId] ??= { up: [], down: [] });
      (v.value > 0 ? e.up : e.down).push(names.get(v.memberId) ?? "?");
    });
    return out;
  }, [room]);

  /** Run the highlight down the board, slowing until it lands on the winner */
  const reveal = useCallback(
    (next: Draw, board: Odd[]) => {
      setError(null);
      setRolling(true);
      setDraw(null);
      const candidates = board.filter((o) => o.weight > 0).slice(0, 12).map((o) => o.id);
      const steps = 16;
      let t = 0;
      for (let i = 0; i < steps; i++) {
        t += 45 + i * i * 1.6;
        const id = i === steps - 1 ? next.restaurantId : candidates[i % Math.max(1, candidates.length)];
        setTimeout(() => setHighlightId(id), t);
      }
      setTimeout(() => {
        setHighlightId(null);
        setDraw(next);
        setRolling(false);
      }, t + 380);
    },
    [],
  );

  // Realtime: the server pushes room changes (votes, filters, draws) and restaurant edits
  const seenEaten = useRef<string | null>(String(initialRoom?.latestDraw?.eatenAt ?? ""));
  const restaurantsRef = useRef(restaurants);
  useEffect(() => {
    restaurantsRef.current = restaurants;
  }, [restaurants]);
  const roomCode = room?.code;
  useEffect(() => {
    const es = new EventSource(roomCode ? `/api/events?room=${roomCode}` : "/api/events");
    es.addEventListener("restaurants", (e) => {
      setRestaurants(JSON.parse((e as MessageEvent).data));
      setNow(Date.now()); // keep the 7-day penalty measured from the current time
    });
    es.addEventListener("categories", (e) => setCategories(JSON.parse((e as MessageEvent).data)));
    es.addEventListener("room", (e) => {
      const next: RoomState | null = JSON.parse((e as MessageEvent).data);
      if (!next) return;
      setRoom(next);
      const d = next.latestDraw as Draw | null;
      if (d && d.id !== seenDraw.current) {
        seenDraw.current = d.id;
        seenEaten.current = String(d.eatenAt ?? "");
        const f = { lazy: next.lazyMode, prices: next.prices };
        reveal(d, computeOdds(restaurantsRef.current, next.scores, f, Date.now(), next.restaurantScores));
      } else if (d && String(d.eatenAt ?? "") !== seenEaten.current) {
        seenEaten.current = String(d.eatenAt ?? "");
        setDraw(d);
      }
    });
    return () => es.close();
  }, [roomCode, reveal]);

  async function markEaten(eaten: boolean) {
    if (!draw) return;
    const res = await fetch(`/api/draws/${draw.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eaten }),
    });
    if (!res.ok) return setError("บันทึกไม่สำเร็จ");
    const next: Draw = await res.json();
    seenEaten.current = String(next.eatenAt ?? "");
    setDraw(next); // the board updates through the "restaurants" event
  }

  async function vote(categoryId: string, value: -1 | 0 | 1) {
    if (!isRoom) {
      const n = { ...soloVotes };
      if (value === 0) delete n[categoryId];
      else n[categoryId] = value;
      setSoloVotes(n);
      saveSolo({ votes: n });
      return;
    }
    if (!room || !member) return;
    // optimistic update
    setRoom((r) => {
      if (!r) return r;
      const votes = r.votes.filter((v) => !(v.memberId === member.id && v.categoryId === categoryId));
      if (value !== 0) votes.push({ memberId: member.id, categoryId, value });
      const s: CategoryScores = {};
      votes.forEach((v) => (s[v.categoryId] = (s[v.categoryId] ?? 0) + v.value));
      return { ...r, votes, scores: s };
    });
    const res = await fetch(`/api/rooms/${room.code}/votes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: member.id, categoryId, value }),
    });
    if (res.ok) setRoom(await res.json());
  }

  /** Vote for a specific restaurant (−1, 0, +1) */
  async function votePick(restaurantId: number, value: -1 | 0 | 1) {
    if (!isRoom) {
      const n = { ...soloPicks };
      if (value === 0) delete n[restaurantId];
      else n[restaurantId] = value;
      setSoloPicks(n);
      saveSolo({ picks: n });
      return;
    }
    if (!room || !member) return;
    setRoom((r) => {
      if (!r) return r;
      const rv = r.restaurantVotes.filter((v) => !(v.memberId === member.id && v.restaurantId === restaurantId));
      if (value !== 0) rv.push({ memberId: member.id, restaurantId, value });
      return { ...r, restaurantVotes: rv, restaurantScores: sumRestaurantVotes(rv) };
    });
    const res = await fetch(`/api/rooms/${room.code}/votes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: member.id, restaurantId, value }),
    });
    if (res.ok) setRoom(await res.json());
  }

  async function setLazy(next: boolean) {
    if (!isRoom) {
      setSoloLazy(next);
      saveSolo({ lazy: next });
      return;
    }
    if (!room) return;
    setRoom({ ...room, lazyMode: next });
    const res = await fetch(`/api/rooms/${room.code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lazyMode: next }),
    });
    if (res.ok) setRoom(await res.json());
  }

  async function setPrices(next: number[]) {
    if (!isRoom) {
      setSoloPrices(next);
      saveSolo({ prices: next });
      return;
    }
    if (!room) return;
    setRoom({ ...room, prices: next });
    await fetch(`/api/rooms/${room.code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prices: next }),
    });
  }

  async function runDraw() {
    setError(null);
    const res = await fetch("/api/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(room ? { roomCode: room.code } : { lazy: soloLazy, prices: soloPrices, scores: soloVotes, picks: soloPicks }),
    });
    const json = await res.json();
    if (!res.ok) return setError(json.error ?? "สุ่มไม่สำเร็จ");
    seenDraw.current = json.id;
    reveal(json, odds);
  }

  async function saveRestaurant(id: number, patch: RestaurantPatch) {
    const res = await fetch(`/api/restaurants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return setError((await res.json()).error ?? "บันทึกไม่สำเร็จ");
    setRestaurants((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  /** Rate a restaurant with a cat (score 1–4, 0 takes my rating back) */
  async function rate(id: number, score: number) {
    if (!rater) return;
    setRestaurants((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const ratings = { ...r.ratings };
        if (score) ratings[rater] = score;
        else delete ratings[rater];
        const all = Object.values(ratings);
        const avg = all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
        return { ...r, ratings, ratingCount: all.length, ratingAvg: avg };
      }),
    );
    const res = await fetch(`/api/restaurants/${id}/rating`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rater, score, name: member?.nickname ?? null }),
    });
    if (!res.ok) setError((await res.json()).error ?? "ให้คะแนนไม่สำเร็จ");
  }

  async function deleteRestaurant(id: number) {
    const res = await fetch(`/api/restaurants/${id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json()).error ?? "ลบไม่สำเร็จ");
    setRestaurants((rs) => rs.filter((r) => r.id !== id));
  }

  async function createRoom() {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lazyMode: soloLazy, prices: soloPrices }),
    });
    if (res.ok) router.push(`/room/${(await res.json()).code}`);
  }

  const winner = draw ? byId.get(draw.restaurantId) : null;
  const disabledList = restaurants.filter((r) => r.disabled);
  const votedCount = Object.values(scores).filter((v) => v !== 0).length;

  if (room && !member) {
    return <JoinRoom code={room.code} members={room.members} onJoined={setMember} />;
  }

  return (
    <div className="rise grid gap-6 pt-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8">
      {/* Draw + winner: first on mobile, right column on desktop */}
      <section className="flex flex-col gap-4 lg:sticky lg:top-6 lg:order-2 lg:self-start">
        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-medium">{room ? `ห้อง ${room.code}` : "วันนี้กินร้านไหน"}</h1>
              <p className="mt-1 text-sm text-fg-2">
                <span data-testid="pool-count">{pool.length}</span> ร้านในระยะเดิน {lazy ? formatMetres(LAZY_RADIUS_M) : "1 กม."} จากจันวาณิชย์
                {prices.length > 0 && " · กรองราคา"}
              </p>
            </div>
            {room && <ShareButton code={room.code} />}
          </div>

          <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-deep px-4 py-3">
            <span className="flex items-center gap-3">
              <Footprints size={18} strokeWidth={1.5} className="text-fg-2" />
              <span>
                <span className="block text-sm">ขี้เกียจเดิน</span>
                <span className="block text-xs text-fg-3">เฉพาะร้านที่เดินไม่เกิน 500 ม. ยิ่งใกล้ยิ่งมีโอกาส</span>
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={lazy}
              onChange={(e) => setLazy(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={`relative h-6 w-10 shrink-0 rounded-full transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-ember ${lazy ? "bg-ember" : "bg-raised"}`}
            >
              <span
                className={`absolute top-1 size-4 rounded-full bg-fg transition-transform duration-200 ease-[var(--ease-out-soft)] ${lazy ? "translate-x-5" : "translate-x-1"}`}
              />
            </span>
          </label>

          <PriceFilter value={prices} onChange={setPrices} />

          <Button variant="primary" className="mt-4 h-12 w-full text-base" onClick={runDraw} disabled={rolling || !pool.length}>
            {rolling ? "กำลังจับสลาก" : draw ? "จับสลากใหม่" : "จับสลาก"}
          </Button>
          {error && <p className="mt-3 text-sm text-bad">{error}</p>}
          {room && (
            <p className="mt-3 text-xs text-fg-3">ใครกดก็ได้ ทุกคนในห้องจะเห็นผลเดียวกัน</p>
          )}
        </div>

        {winner && draw && (
          <WinnerCard
            r={winner}
            p={draw.probability}
            eaten={Boolean(draw.eatenAt)}
            myRating={rater ? (winner.ratings[rater] ?? 0) : 0}
            onRate={(s) => rate(winner.id, s)}
            labels={categories}
            onEaten={markEaten}
          />
        )}

        {!isRoom && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-card p-5">
            <div>
              <div className="text-sm">ไปกินกันหลายคน</div>
              <div className="text-xs text-fg-3">เปิดห้องแล้วส่งลิงก์ให้ทุกคนโหวตแนวอาหาร</div>
            </div>
            <Button onClick={createRoom}>
              <Users size={16} strokeWidth={1.5} />
              เปิดห้อง
            </Button>
          </div>
        )}
      </section>

      {/* Votes + odds board */}
      <div className="flex min-w-0 flex-col gap-6 lg:order-1">
        <section className="rounded-2xl border border-line bg-card p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="flex items-baseline gap-3 text-base font-medium">
              วันนี้อยากกินแนวไหน
              <Link href="/categories" className="text-xs font-normal text-fg-3 underline-offset-4 hover:text-fg hover:underline">
                จัดการแนวอาหาร
              </Link>
            </h2>
            <span className="text-xs text-fg-3" data-testid="vote-status">
              {room
                ? `${room.members.length} คนในห้อง · คุณคือ ${member?.nickname}`
                : votedCount
                  ? `โหวตแล้ว ${votedCount} แนว`
                  : "กด + แนวที่อยาก กด − แนวที่ไม่เอา"}
            </span>
          </div>
          <CategoryVotes
            categories={categories}
            counts={counts}
            myVotes={myVotes}
            scores={scores}
            voters={voters}
            onVote={vote}
          />
        </section>

        <section className="rounded-2xl border border-line bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-medium">กระดานโอกาส</h2>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-fg-3 sm:inline">
                {view === "list" ? "กดที่ชื่อร้านเพื่อแก้ชื่อเล่น ราคา แนวอาหาร หรือปิดร้าน" : "กดหมุดเพื่อดูร้านและโหวต"}
              </span>
              <div role="radiogroup" aria-label="มุมมอง" className="flex rounded-lg border border-line bg-deep p-0.5">
                {(
                  [
                    ["list", "รายการ", List],
                    ["map", "แผนที่", MapIcon],
                  ] as const
                ).map(([v, label, Icon]) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={view === v}
                    onClick={() => setView(v)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs transition-colors ${
                      view === v ? "bg-raised text-fg" : "text-fg-3 hover:text-fg"
                    }`}
                  >
                    <Icon size={14} strokeWidth={1.5} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {view === "map" ? (
            <OddsMap
              odds={odds}
              byId={byId}
              categories={categories}
              lazy={lazy}
              highlightId={highlightId}
              winnerId={draw?.restaurantId ?? null}
              picks={picks}
              myPicks={myPicks}
              pickVoters={pickVoters}
              onPick={votePick}
              rater={rater}
              onRate={rate}
            />
          ) : (
          <OddsBoard
            odds={odds}
            byId={byId}
            categories={categories}
            highlightId={highlightId}
            winnerId={draw?.restaurantId ?? null}
            showAll={showAll}
            onToggleAll={() => setShowAll((s) => !s)}
            disabled={disabledList}
            onSave={saveRestaurant}
            onDelete={deleteRestaurant}
            rater={rater}
            onRate={rate}
            picks={picks}
            myPicks={myPicks}
            pickVoters={pickVoters}
            onPick={votePick}
            lazy={lazy}
            now={now}
          />
          )}
        </section>
      </div>
    </div>
  );
}

function WinnerCard({
  r,
  p,
  eaten,
  labels,
  onEaten,
  myRating,
  onRate,
}: {
  r: RestaurantDTO;
  p: number;
  eaten: boolean;
  labels: Category[];
  onEaten: (eaten: boolean) => void;
  myRating: number;
  onRate: (score: number) => void;
}) {
  const walk = walkMetres(r);
  const names = new Map(labels.map((c) => [c.id, c.label]));
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches)
      ref.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [r.id]);
  return (
    <article
      ref={ref}
      data-testid="winner"
      data-number={r.number}
      className="rise scroll-mt-4 rounded-2xl border border-line bg-card p-5"
      aria-live="polite"
    >
      <div className="text-xs text-fg-3">ผลจับสลาก · โอกาส {formatPercent(p)}</div>
      <div className="mt-3 flex items-start gap-3">
        <NumberTag n={r.number} tone="win" />
        <div className="min-w-0">
          <h2 className="text-2xl leading-tight font-medium">{displayName(r)}</h2>
          {r.nickname ? (
            <div className="mt-0.5 truncate text-sm text-fg-2">{r.name}</div>
          ) : (
            r.nameEn && r.nameEn !== r.name && <div className="mt-0.5 truncate text-sm text-fg-2">{r.nameEn}</div>
          )}
          <div className="mt-2 text-sm text-fg-2">
            {r.categories.map((c) => names.get(c) ?? c).join(" · ")}
            {r.priceLevel != null && <span className="font-mono"> · {priceLabel(r.priceLevel)}</span>}
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
        <div className="bg-deep px-4 py-3">
          <dt className="text-xs text-fg-3">เดิน</dt>
          <dd className="font-mono text-lg tnum">{formatMetres(walk)}</dd>
        </div>
        <div className="bg-deep px-4 py-3">
          <dt className="text-xs text-fg-3">ประมาณ</dt>
          <dd className="font-mono text-lg tnum">{walkMinutes(walk)} นาที</dd>
        </div>
      </dl>
      {r.openingHours && <p className="mt-3 font-mono text-xs text-fg-3">เวลาเปิด {r.openingHours}</p>}

      <div className="mt-4">
        <WalkMap lat={r.lat} lon={r.lon} />
      </div>

      <Button
        variant={eaten ? "ghost" : "secondary"}
        className="mt-4 h-11 w-full"
        aria-pressed={eaten}
        onClick={() => onEaten(!eaten)}
      >
        <UtensilsCrossed size={16} strokeWidth={1.5} />
        {eaten ? "บันทึกว่ากินร้านนี้แล้ว · ยกเลิก" : "ไปกินร้านนี้"}
      </Button>
      <p className="mt-2 text-xs text-fg-3">
        {eaten ? "ร้านนี้จะมีโอกาสน้อยลงใน 7 วันข้างหน้า" : "กดเมื่อไปกินจริง ร้านนี้จะมีโอกาสน้อยลงใน 7 วันข้างหน้า"}
      </p>

      <div className="mt-4 border-t border-line pt-4">
        <RatingPicker mine={myRating} avg={r.ratingAvg} count={r.ratingCount} onRate={onRate} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a href={googleDirectionsUrl(r.lat, r.lon)} target="_blank" rel="noreferrer" className="contents">
          <Button variant="ghost" className="w-full">
            <Navigation size={16} strokeWidth={1.5} />
            นำทางเดิน
          </Button>
        </a>
        <a href={googleMapsUrl(r.lat, r.lon, r.name)} target="_blank" rel="noreferrer" className="contents">
          <Button variant="ghost" className="w-full">
            <MapPin size={16} strokeWidth={1.5} />
            Google Maps
          </Button>
        </a>
      </div>
    </article>
  );
}

function ShareButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      className="shrink-0"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${location.origin}/room/${code}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {copied ? <Check size={16} strokeWidth={1.5} /> : <Copy size={16} strokeWidth={1.5} />}
      {copied ? "คัดลอกแล้ว" : "ลิงก์ห้อง"}
    </Button>
  );
}

function JoinRoom({
  code,
  members,
  onJoined,
}: {
  code: string;
  members: { id: string; nickname: string }[];
  onJoined: (m: { id: string; nickname: string }) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/rooms/${code}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: name }),
    });
    setBusy(false);
    if (!res.ok) return setErr((await res.json()).error ?? "เข้าห้องไม่สำเร็จ");
    const m = await res.json();
    writeStore(memberKey(code), m);
    onJoined(m);
  }

  return (
    <div className="rise mx-auto mt-16 max-w-sm rounded-2xl border border-line bg-card p-6">
      <div className="font-mono text-xs text-fg-3">ห้อง {code}</div>
      <h1 className="mt-2 text-xl font-medium">ใส่ชื่อเล่นเพื่อโหวต</h1>
      <p className="mt-1 text-sm text-fg-2">
        {members.length ? `ในห้องตอนนี้ ${members.map((m) => m.nickname).join(", ")}` : "ยังไม่มีใครเข้าห้อง"}
      </p>
      <form onSubmit={join} className="mt-5 flex gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="ชื่อเล่น"
          aria-label="ชื่อเล่น"
          className="h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-raised px-3 text-sm placeholder:text-fg-3 focus:border-ember/60 focus:outline-none"
        />
        <Button variant="primary" className="h-10" disabled={busy || !name.trim()}>
          เข้าห้อง
        </Button>
      </form>
      {err && <p className="mt-3 text-sm text-bad">{err}</p>}
    </div>
  );
}
