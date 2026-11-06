"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, EyeOff, Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { PRICE_LEVELS, nearMultiplier, recencyMultiplier, walkMetres, type Odd } from "@/lib/odds";
import type { RestaurantDTO } from "@/lib/server";
import type { Category } from "./category-votes";
import type { RestaurantPatch } from "./lunch-app";
import { Button, NumberTag, displayName, formatMetres, formatPercent, priceLabel } from "./ui";
import { VoteControl, votersTitle } from "./vote-control";
import { RatingPicker, RatingSummary } from "./rating";

export type Voters = Record<string | number, { up: string[]; down: string[] }>;

function eatenAgo(iso: string, now: number) {
  const days = Math.floor((now - Date.parse(iso)) / (24 * 3600 * 1000));
  return days <= 0 ? "วันนี้" : days === 1 ? "เมื่อวาน" : ` ${days} วันก่อน`;
}

type Props = {
  odds: Odd[];
  byId: Map<number, RestaurantDTO>;
  categories: Category[];
  highlightId: number | null;
  winnerId: number | null;
  showAll: boolean;
  now: number;
  disabled: RestaurantDTO[];
  onToggleAll: () => void;
  onSave: (id: number, patch: RestaurantPatch) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  /** votes for restaurants: everyone's net, my own, and who voted */
  picks: Record<number, number>;
  myPicks: Record<number, number>;
  pickVoters?: Voters;
  onPick: (id: number, value: -1 | 0 | 1) => void;
  lazy: boolean;
  rater: string | null;
  onRate: (id: number, score: number) => void;
};

const TOP = 15;
const COLS = "grid-cols-[44px_1fr_auto_auto] sm:grid-cols-[44px_1fr_72px_96px_auto_64px]";

export function OddsBoard({
  odds,
  byId,
  categories,
  highlightId,
  winnerId,
  showAll,
  now,
  disabled,
  onToggleAll,
  onSave,
  onDelete,
  picks,
  myPicks,
  pickVoters,
  onPick,
  lazy,
  rater,
  onRate,
}: Props) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [showDisabled, setShowDisabled] = useState(false);
  const labels = new Map(categories.map((c) => [c.id, c.label]));
  const maxP = odds[0]?.p ?? 0;
  // orange marks the leader only when the odds actually differ; with equal odds there is no leader
  const hasLeader = maxP - (odds[odds.length - 1]?.p ?? 0) > 1e-9;

  let rows = showAll ? odds : odds.slice(0, TOP);
  // keep the winner, and the row being edited, on the board even when they rank low
  const extra = [highlightId, winnerId, openId].filter(
    (id): id is number => id != null && !rows.some((r) => r.id === id),
  );
  if (extra.length) rows = [...rows, ...odds.filter((o) => extra.includes(o.id))];

  return (
    <div>
      <div className={`grid ${COLS} items-center gap-3 border-b border-line px-3 pb-2 text-xs text-fg-3`}>
        <span>เบอร์</span>
        <span>ร้าน</span>
        <span className="hidden text-right sm:block">เดิน</span>
        <span className="hidden text-center sm:block" title="ความยาวแถบ = โอกาสเทียบกับร้านอันดับ 1">
          เทียบอันดับ 1
        </span>
        <span className="w-[86px] text-center">อยากไป</span>
        <span className="text-right">โอกาส</span>
      </div>
      {odds.length === 0 && <p className="px-3 py-6 text-sm text-fg-3">ไม่มีร้านที่ตรงกับตัวกรองนี้</p>}
      <ol>
        {rows.map((o, i) => {
          const r = byId.get(o.id);
          if (!r) return null;
          return (
            <li key={o.id} className="border-b border-line">
              <Row
                rank={hasLeader ? i : -1}
                r={r}
                odd={o}
                maxP={maxP}
                lit={highlightId === o.id}
                won={winnerId === o.id && highlightId == null}
                labels={labels}
                now={now}
                open={openId === o.id}
                onToggle={() => setOpenId(openId === o.id ? null : o.id)}
                lazy={lazy}
                net={picks[o.id] ?? 0}
                mine={myPicks[o.id] ?? 0}
                voters={pickVoters?.[o.id]}
                onPick={(v) => onPick(o.id, v)}
              />
              {openId === o.id && (
                <Editor
                  r={r}
                  categories={categories}
                  onCancel={() => setOpenId(null)}
                  onSave={async (patch) => {
                    await onSave(r.id, patch);
                    setOpenId(null);
                  }}
                  onDelete={async () => {
                    await onDelete(r.id);
                    setOpenId(null);
                  }}
                  myRating={rater ? (r.ratings[rater] ?? 0) : 0}
                  onRate={(s) => onRate(r.id, s)}
                />
              )}
            </li>
          );
        })}
      </ol>
      {odds.length > TOP && (
        <button
          type="button"
          onClick={onToggleAll}
          className="mt-2 w-full rounded-lg py-2 text-sm text-fg-2 transition-colors hover:bg-raised hover:text-fg"
        >
          {showAll ? "แสดงเฉพาะ 15 อันดับแรก" : `แสดงทั้งหมด ${odds.length} ร้าน`}
        </button>
      )}

      {disabled.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <button
            type="button"
            aria-expanded={showDisabled}
            onClick={() => setShowDisabled((s) => !s)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-fg-2 transition-colors hover:bg-raised hover:text-fg"
          >
            <span className="flex items-center gap-2">
              <EyeOff size={16} strokeWidth={1.5} />
              ร้านที่ปิดไว้ <span className="font-mono text-fg-3 tnum">{disabled.length}</span>
            </span>
            <ChevronDown
              size={14}
              strokeWidth={1.5}
              className={`text-fg-3 transition-transform ${showDisabled ? "rotate-180" : ""}`}
            />
          </button>
          {showDisabled && (
            <ul className="mt-1">
              {disabled.map((r) => (
                <li
                  key={r.id}
                  data-testid="disabled-row"
                  data-number={r.number}
                  className="flex min-h-12 items-center gap-3 border-b border-line px-3 py-1.5 last:border-0"
                >
                  <NumberTag n={r.number} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-fg-2">{displayName(r)}</div>
                    {r.nickname && <div className="truncate text-xs text-fg-3">{r.name}</div>}
                  </div>
                  <Button variant="ghost" onClick={() => onSave(r.id, { disabled: false })}>
                    <RotateCcw size={16} strokeWidth={1.5} />
                    เปิดอีกครั้ง
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  rank,
  r,
  odd,
  maxP,
  lit,
  won,
  labels,
  now,
  open,
  onToggle,
  lazy,
  net,
  mine,
  voters,
  onPick,
}: {
  rank: number;
  r: RestaurantDTO;
  odd: Odd;
  maxP: number;
  lit: boolean;
  won: boolean;
  labels: Map<string, string>;
  now: number;
  open: boolean;
  onToggle: () => void;
  lazy: boolean;
  net: number;
  mine: number;
  voters?: { up: string[]; down: string[] };
  onPick: (value: -1 | 0 | 1) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // desktop only: on mobile the board sits below the result card, which gets the focus instead
    if ((lit || won) && window.matchMedia("(min-width: 1024px)").matches)
      ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [lit, won]);

  const active = lit || won;
  const name = displayName(r);
  return (
    <div
      ref={ref}
      data-testid="odds-row"
      data-number={r.number}
      className={`grid ${COLS} min-h-12 w-full items-center gap-3 rounded-lg px-3 py-1.5 transition-colors duration-100 ${
        active ? "bg-ember-soft" : "hover:bg-raised/60"
      }`}
    >
      <NumberTag n={r.number} tone={active ? "win" : "default"} />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        data-testid="odds-open"
        className="min-w-0 text-left"
      >
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm" data-testid="odds-name">{displayName(r)}</span>
          {r.manual && (
            <span className="shrink-0 rounded border border-line px-1.5 text-[11px] text-fg-3" data-testid="manual-tag">
              เพิ่มเอง
            </span>
          )}
          {r.priceLevel != null && <span className="shrink-0 font-mono text-xs text-fg-2">{priceLabel(r.priceLevel)}</span>}
          <RatingSummary avg={r.ratingAvg} count={r.ratingCount} />
          <ChevronDown
            size={14}
            strokeWidth={1.5}
            className={`shrink-0 text-fg-3 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
        <span className="block truncate text-xs text-fg-3">
          {r.nickname && <span>{r.name} · </span>}
          {r.categories.map((c) => labels.get(c) ?? c).join(" · ")}
          <span className="sm:hidden"> · {formatMetres(walkMetres(r))}</span>
          {r.baseWeight !== 1 && <span className="font-mono"> · น้ำหนัก ×{r.baseWeight}</span>}
          {lazy && <span className="font-mono"> · ใกล้ ×{nearMultiplier(r, true).toFixed(1)}</span>}
          {r.lastEatenAt && (
            <span className="text-fg-2">
              {" "}· กินไปเมื่อ{eatenAgo(r.lastEatenAt, now)}{" "}
              <span className="font-mono">×{recencyMultiplier(r.lastEatenAt, now).toFixed(1)}</span>
            </span>
          )}
        </span>
      </button>
      <span className="hidden text-right font-mono text-xs text-fg-2 tnum sm:block">{formatMetres(walkMetres(r))}</span>
      <span className="hidden h-1.5 overflow-hidden rounded-full bg-deep sm:block">
        <span
          className={`block h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out-soft)] ${
            rank === 0 || active ? "bg-ember" : "bg-fg-3/60"
          }`}
          style={{ width: `${maxP ? (odd.p / maxP) * 100 : 0}%` }}
        />
      </span>
      <VoteControl
        mine={mine}
        net={net}
        downLabel={`ไม่อยากไปร้าน ${name}`}
        upLabel={`อยากไปร้าน ${name}`}
        title={votersTitle(voters)}
        onVote={onPick}
      />
      <span
        data-testid="odds-p"
        className={`text-right font-mono text-sm tnum ${rank === 0 || active ? "text-ember-ink" : "text-fg-2"}`}
      >
        {formatPercent(odd.p)}
      </span>
    </div>
  );
}

function Editor({
  r,
  categories,
  onCancel,
  onSave,
  onDelete,
  myRating,
  onRate,
}: {
  r: RestaurantDTO;
  categories: Category[];
  onCancel: () => void;
  onSave: (patch: RestaurantPatch) => Promise<void>;
  onDelete: () => Promise<void>;
  myRating: number;
  onRate: (score: number) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [nickname, setNickname] = useState(r.nickname ?? "");
  const [price, setPrice] = useState<number | null>(r.priceLevel);
  const [weight, setWeight] = useState(r.baseWeight);
  const [cats, setCats] = useState<string[]>(r.categories);
  const [saving, setSaving] = useState(false);
  const toggle = (id: string) => setCats((cs) => (cs.includes(id) ? cs.filter((c) => c !== id) : [...cs, id]));

  async function save(patch: RestaurantPatch) {
    setSaving(true);
    try {
      await onSave(patch);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-3 mb-3 flex flex-col gap-4 rounded-xl border border-line bg-deep p-4">
      <RatingPicker mine={myRating} avg={r.ratingAvg} count={r.ratingCount} onRate={onRate} compact />
      <label className="block">
        <span className="mb-2 block text-xs text-fg-3">ชื่อเล่นร้าน</span>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={40}
          placeholder={r.name}
          className="h-10 w-full rounded-lg border border-line-strong bg-raised px-3 text-sm placeholder:text-fg-3 focus:border-ember/60 focus:outline-none"
        />
      </label>

      <div>
        <div className="mb-2 text-xs text-fg-3">ราคาต่อคน</div>
        <div className="grid grid-cols-5 gap-1">
          {PRICE_LEVELS.map((p) => (
            <button
              key={p.level}
              type="button"
              aria-pressed={price === p.level}
              onClick={() => setPrice(price === p.level ? null : p.level)}
              className={`h-12 rounded-lg border text-xs transition-colors ${
                price === p.level ? "border-ember/50 bg-ember-soft text-ember-ink" : "border-line text-fg-2 hover:text-fg"
              }`}
            >
              <span className="block font-mono">{p.label}</span>
              <span className="block text-[11px] text-fg-3">{p.hint}</span>
            </button>
          ))}
          <button
            type="button"
            aria-pressed={price === null}
            onClick={() => setPrice(null)}
            className={`h-12 rounded-lg border text-xs transition-colors ${
              price === null ? "border-line-strong bg-raised text-fg" : "border-line text-fg-2 hover:text-fg"
            }`}
          >
            ไม่ระบุ
          </button>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs text-fg-3">ร้านนี้มีอาหารแนวไหน</div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => {
            const on = cats.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(c.id)}
                className={`h-8 rounded-lg border px-3 text-xs transition-colors ${
                  on ? "border-ember/50 bg-ember-soft text-ember-ink" : "border-line text-fg-2 hover:text-fg"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-fg-3">น้ำหนักพื้นฐาน</span>
          <div className="flex items-center rounded-lg border border-line bg-card p-0.5">
            <button
              type="button"
              aria-label="ลดน้ำหนัก"
              onClick={() => setWeight((w) => Math.max(0.5, w - 0.5))}
              className="grid size-8 place-items-center rounded-md text-fg-2 hover:text-fg"
            >
              <Minus size={16} strokeWidth={1.5} />
            </button>
            <span className="w-10 text-center font-mono text-sm tnum">×{weight}</span>
            <button
              type="button"
              aria-label="เพิ่มน้ำหนัก"
              onClick={() => setWeight((w) => Math.min(5, w + 0.5))}
              className="grid size-8 place-items-center rounded-md text-fg-2 hover:text-fg"
            >
              <Plus size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" disabled={saving} onClick={() => save({ disabled: true })}>
            <EyeOff size={16} strokeWidth={1.5} />
            ปิดร้านนี้
          </Button>
          {/* only restaurants added by hand can be deleted; two steps so it is never by accident */}
          {r.manual &&
            (confirmDelete ? (
              <Button
                variant="ghost"
                className="text-bad hover:text-bad"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await onDelete();
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <Trash2 size={16} strokeWidth={1.5} />
                ยืนยันลบร้าน
              </Button>
            ) : (
              <Button variant="ghost" disabled={saving} onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} strokeWidth={1.5} />
                ลบร้านนี้
              </Button>
            ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button
            variant="secondary"
            disabled={saving || cats.length === 0}
            onClick={() =>
              save({ nickname: nickname.trim() || null, priceLevel: price, baseWeight: weight, categories: cats })
            }
          >
            บันทึก
          </Button>
        </div>
      </div>
    </div>
  );
}
