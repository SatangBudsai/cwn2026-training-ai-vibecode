"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Footprints, List, Map as MapIcon, MapPin, Navigation, Search, Users, UtensilsCrossed, X } from "lucide-react";
import {
  computeOdds,
  sumRestaurantVotes,
  sumVotes,
  walkMetres,
  type CategoryScores,
  type DrawFilter,
  type Odd,
  type RestaurantScores,
} from "@/lib/odds";
import { googleDirectionsUrl, googleMapsUrl, LAZY_RADIUS_M } from "@/lib/geo";
import type { RealtimeMode, RestaurantDTO, RoomState } from "@/lib/server";
import { CategoryVotes, type Category } from "./category-votes";
import { OddsBoard } from "./odds-board";
import { OddsMap } from "./odds-map";
import { WalkMap } from "./walk-map";
import { matchesQuery } from "@/lib/search";
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
  /** how live updates arrive: SSE (one server) or polling (Vercel) */
  realtime: RealtimeMode;
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

export function LunchApp({
  restaurants: initialRestaurants,
  categories: initialCategories,
  room: initialRoom,
  realtime,
}: Props) {
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
  // votes not saved yet: { categoryId: value } and { restaurantId: value }
  const [draftVotes, setDraftVotes] = useState<Record<string, number>>({});
  const [draftPicks, setDraftPicks] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
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
    const onRestaurants = (list: RestaurantDTO[]) => {
      setRestaurants(list);
      setNow(Date.now()); // keep the 7-day penalty measured from the current time
    };
    const onRoom = (next: RoomState | null) => {
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
    };

    if (realtime === "poll") {
      // Vercel: no shared process to push from, so ask about once a second
      let v = -1;
      let stopped = false;
      const tick = async () => {
        if (stopped || document.hidden) return;
        const res = await fetch(`/api/poll?v=${v}${roomCode ? `&room=${roomCode}` : ""}`, { cache: "no-store" }).catch(() => null);
        if (!res?.ok || stopped) return;
        const data = await res.json();
        if (data.restaurants) onRestaurants(data.restaurants);
        if (data.categories) setCategories(data.categories);
        if (roomCode) onRoom(data.room);
        v = data.v;
      };
      tick();
      const timer = setInterval(tick, 1000);
      return () => {
        stopped = true;
        clearInterval(timer);
      };
    }

    const es = new EventSource(roomCode ? `/api/events?room=${roomCode}` : "/api/events");
    es.addEventListener("restaurants", (e) => onRestaurants(JSON.parse((e as MessageEvent).data)));
    es.addEventListener("categories", (e) => setCategories(JSON.parse((e as MessageEvent).data)));
    es.addEventListener("room", (e) => onRoom(JSON.parse((e as MessageEvent).data)));
    return () => es.close();
  }, [roomCode, reveal, realtime]);

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

  // ---------- votes are drafted first and sent together with "บันทึกโหวต" ----------
  // so the board does not re-sort (and jump) on every tap

  function vote(categoryId: string, value: -1 | 0 | 1) {
    setSaveError(null);
    setDraftVotes((d) => {
      const n = { ...d };
      if (value === (myVotes[categoryId] ?? 0)) delete n[categoryId];
      else n[categoryId] = value;
      return n;
    });
  }

  function votePick(restaurantId: number, value: -1 | 0 | 1) {
    setSaveError(null);
    setDraftPicks((d) => {
      const n = { ...d };
      if (value === (myPicks[restaurantId] ?? 0)) delete n[restaurantId];
      else n[restaurantId] = value;
      return n;
    });
  }

  function cancelDraft() {
    setDraftVotes({});
    setDraftPicks({});
  }

  async function saveVotes() {
    const cats = Object.entries(draftVotes);
    const places = Object.entries(draftPicks).map(([id, v]) => [Number(id), v] as const);
    if (!cats.length && !places.length) return;
    setSaveError(null);

    if (!isRoom) {
      const v = { ...soloVotes };
      for (const [k, val] of cats) {
        if (val === 0) delete v[k];
        else v[k] = val;
      }
      const pk = { ...soloPicks };
      for (const [k, val] of places) {
        if (val === 0) delete pk[k];
        else pk[k] = val;
      }
      setSoloVotes(v);
      setSoloPicks(pk);
      saveSolo({ votes: v, picks: pk });
      cancelDraft();
      return;
    }

    if (!room || !member) return;
    setSaving(true);
    const before = room;
    // show the result right away; the live room event confirms it a moment later
    setRoom((r) => {
      if (!r) return r;
      let votes = r.votes;
      for (const [categoryId, value] of cats) {
        votes = votes.filter((x) => !(x.memberId === member.id && x.categoryId === categoryId));
        if (value !== 0) votes = [...votes, { memberId: member.id, categoryId, value }];
      }
      let rv = r.restaurantVotes;
      for (const [restaurantId, value] of places) {
        rv = rv.filter((x) => !(x.memberId === member.id && x.restaurantId === restaurantId));
        if (value !== 0) rv = [...rv, { memberId: member.id, restaurantId, value }];
      }
      return { ...r, votes, scores: sumVotes(votes), restaurantVotes: rv, restaurantScores: sumRestaurantVotes(rv) };
    });
    cancelDraft();

    const bodies = [
      ...cats.map(([categoryId, value]) => ({ categoryId, value })),
      ...places.map(([restaurantId, value]) => ({ restaurantId, value })),
    ];
    let failed = false;
    for (const body of bodies) {
      const res = await fetch(`/api/rooms/${room.code}/votes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id, ...body }),
      }).catch(() => null);
      // replies are not applied to the screen: a slow reply could overwrite newer votes;
      // the room's live event carries the current state instead
      if (!res?.ok) {
        failed = true;
        break;
      }
    }
    setSaving(false);
    if (failed) {
      setSaveError("บันทึกโหวตไม่สำเร็จ ห้องนี้อาจหมดอายุแล้ว ลองรีโหลดหน้า");
      const fresh = await fetch(`/api/rooms/${room.code}`, { cache: "no-store" }).catch(() => null);
      if (fresh?.ok) setRoom(await fresh.json());
      else setRoom(before); // the room is gone: take the optimistic votes back
    }
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

  // search only changes what is shown, never the odds or the draw
  const matchIds = useMemo(() => {
    if (!query.trim()) return null;
    const catLabels = new Map(categories.map((c) => [c.id, c.label]));
    return new Set(restaurants.filter((r) => matchesQuery(r, query, catLabels)).map((r) => r.id));
  }, [query, restaurants, categories]);
  const inPool = new Set(odds.map((o) => o.id));
  const matchesInPool = matchIds ? odds.filter((o) => matchIds.has(o.id)).length : 0;
  const matchesFiltered = matchIds ? [...matchIds].filter((id) => !inPool.has(id) && !byId.get(id)?.disabled).length : 0;
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
                {prices.length > 0 && " · กรองตามราคา"}
              </p>
            </div>
            {room && <ShareButton code={room.code} />}
          </div>

          <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-deep px-4 py-3">
            <span className="flex items-center gap-3">
              <Footprints size={18} strokeWidth={1.5} className="text-fg-2" />
              <span>
                <span className="block text-sm">ขี้เกียจเดิน</span>
                <span className="block text-xs text-fg-3">เดินไม่เกิน 500 ม. ยิ่งใกล้ยิ่งมีโอกาส</span>
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
            {rolling ? "กำลังสุ่ม" : draw ? "สุ่มใหม่" : "สุ่มร้าน"}
          </Button>
          {error && <p className="mt-3 text-sm text-bad">{error}</p>}
          {room && (
            <p className="mt-3 text-xs text-fg-3">ใครกดสุ่มก็ได้ ทุกคนในห้องเห็นผลเดียวกัน</p>
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
              <div className="text-xs text-fg-3">สร้างห้องแล้วส่งลิงก์ให้เพื่อนมาโหวตด้วยกัน</div>
            </div>
            <Button onClick={createRoom}>
              <Users size={16} strokeWidth={1.5} />
              สร้างห้อง
            </Button>
          </div>
        )}
      </section>

      {/* Votes + odds board */}
      <div className="flex min-w-0 flex-col gap-6 lg:order-1">
        <section className="rounded-2xl border border-line bg-card p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="flex items-baseline gap-3 text-base font-medium">
              วันนี้อยากกินอะไร
              <Link href="/categories" className="text-xs font-normal text-fg-3 underline-offset-4 hover:text-fg hover:underline">
                จัดการประเภทอาหาร
              </Link>
            </h2>
            <span className="text-xs text-fg-3" data-testid="vote-status">
              {room
                ? `ในห้องมี ${room.members.length} คน · คุณคือ ${member?.nickname}`
                : votedCount
                  ? `โหวตแล้ว ${votedCount} ประเภท`
                  : "เห็นด้วย = อยากกิน · ไม่เห็นด้วย = ไม่อยากกิน"}
            </span>
          </div>
          <CategoryVotes
            categories={categories}
            counts={counts}
            myVotes={{ ...myVotes, ...draftVotes }}
            pending={draftVotes}
            scores={scores}
            voters={voters}
            onVote={vote}
          />
        </section>

        <section className="rounded-2xl border border-line bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-medium">โอกาสของแต่ละร้าน</h2>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-fg-3 sm:inline">
                {view === "list" ? "กดชื่อร้านเพื่อให้คะแนนหรือแก้ข้อมูลร้าน" : "กดหมุดเพื่อดูร้านและโหวต"}
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
          <SearchBox
            value={query}
            onChange={setQuery}
            found={matchesInPool}
            filtered={matchesFiltered}
          />
          {view === "map" ? (
            <OddsMap
              odds={odds}
              byId={byId}
              categories={categories}
              lazy={lazy}
              highlightId={highlightId}
              winnerId={draw?.restaurantId ?? null}
              picks={picks}
              myPicks={{ ...myPicks, ...draftPicks }}
              pending={draftPicks}
              pickVoters={pickVoters}
              onPick={votePick}
              rater={rater}
              onRate={rate}
              matchIds={matchIds}
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
            myPicks={{ ...myPicks, ...draftPicks }}
            pending={draftPicks}
            pickVoters={pickVoters}
            onPick={votePick}
            lazy={lazy}
            now={now}
            matchIds={matchIds}
            query={query}
          />
          )}
        </section>
      </div>
      <SaveBar
        count={Object.keys(draftVotes).length + Object.keys(draftPicks).length}
        saving={saving}
        error={saveError}
        onSave={saveVotes}
        onCancel={cancelDraft}
        onDismiss={() => setSaveError(null)}
      />
    </div>
  );
}

/** Floating bar: unsaved votes, or why saving failed */
function SaveBar({
  count,
  saving,
  error,
  onSave,
  onCancel,
  onDismiss,
}: {
  count: number;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  if (!count && !error) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div
        data-testid="vote-savebar"
        role={error ? "alert" : "status"}
        className="rise pointer-events-auto flex w-full max-w-xl flex-wrap items-center gap-3 rounded-2xl border border-line-strong bg-card px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      >
        {error ? (
          <>
            <span className="min-w-0 flex-1 text-sm text-bad">{error}</span>
            <Button variant="ghost" onClick={onDismiss}>
              ปิด
            </Button>
          </>
        ) : (
          <>
            <span className="min-w-0 flex-1 text-sm">
              มีโหวตที่ยังไม่บันทึก <span className="font-mono tnum">{count}</span> รายการ
              <span className="block text-xs text-fg-3">กดบันทึกแล้วโอกาสของแต่ละร้านจะคำนวณใหม่</span>
            </span>
            <Button variant="ghost" onClick={onCancel} disabled={saving}>
              ยกเลิก
            </Button>
            <Button variant="primary" onClick={onSave} disabled={saving}>
              {saving ? "กำลังบันทึก" : "บันทึกโหวต"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  found,
  filtered,
}: {
  value: string;
  onChange: (v: string) => void;
  found: number;
  filtered: number;
}) {
  const active = value.trim().length > 0;
  return (
    <div className="mb-4">
      <div className="relative">
        <Search size={16} strokeWidth={1.5} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-3" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onChange("")}
          placeholder="ค้นหาร้าน ชื่อเล่น ประเภทอาหาร หรือเบอร์"
          aria-label="ค้นหาร้าน"
          className="h-10 w-full rounded-lg border border-line-strong bg-raised pr-10 pl-9 text-sm placeholder:text-fg-3 focus:border-ember/60 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {active && (
          <button
            type="button"
            aria-label="ล้างคำค้น"
            onClick={() => onChange("")}
            className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-md text-fg-3 hover:bg-card hover:text-fg"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>
      {active && (
        <p className="mt-2 text-xs text-fg-3" data-testid="search-status" aria-live="polite">
          {found ? `พบ ${found} ร้าน` : "ไม่พบร้านที่ตรงกับคำค้น"}
          {filtered > 0 && ` · อีก ${filtered} ร้านตรงคำค้นแต่ถูกตัวกรองซ่อนไว้ (ขี้เกียจเดินหรือช่วงราคา)`}
        </p>
      )}
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
      <div className="text-xs text-fg-3">ผลการสุ่ม · มีโอกาส {formatPercent(p)}</div>
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
          <dt className="text-xs text-fg-3">ระยะเดิน</dt>
          <dd className="font-mono text-lg tnum">{formatMetres(walk)}</dd>
        </div>
        <div className="bg-deep px-4 py-3">
          <dt className="text-xs text-fg-3">เวลาเดิน</dt>
          <dd className="font-mono text-lg tnum">ประมาณ {walkMinutes(walk)} นาที</dd>
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
        {eaten ? "ไปกินแล้ว · กดเพื่อยกเลิก" : "ไปกินร้านนี้"}
      </Button>
      <p className="mt-2 text-xs text-fg-3">
        {eaten ? "ร้านนี้จะถูกสุ่มน้อยลงใน 7 วันจากนี้" : "กดเมื่อไปกินจริง ร้านนี้จะถูกสุ่มน้อยลงใน 7 วันจากนี้"}
      </p>

      <div className="mt-4 border-t border-line pt-4">
        <RatingPicker mine={myRating} avg={r.ratingAvg} count={r.ratingCount} onRate={onRate} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a href={googleDirectionsUrl(r.lat, r.lon)} target="_blank" rel="noreferrer" className="contents">
          <Button variant="ghost" className="w-full">
            <Navigation size={16} strokeWidth={1.5} />
            เส้นทางเดิน
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
      {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
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
        {members.length ? `ตอนนี้ในห้องมี ${members.map((m) => m.nickname).join(", ")}` : "ยังไม่มีใครเข้าห้อง"}
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
