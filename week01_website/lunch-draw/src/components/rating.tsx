"use client";

import Image from "next/image";
import { RATINGS, ratingFor } from "@/lib/odds";

/** The cat for a restaurant's average rating, with how many people rated */
export function RatingSummary({ avg, count, size = 20 }: { avg: number | null; count: number; size?: number }) {
  if (avg == null || !count) return null;
  const cat = ratingFor(avg);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 text-xs text-fg-2"
      title={`คะแนนเฉลี่ย ${avg.toFixed(1)} จาก 4 · ${count} คน`}
      data-testid="rating-summary"
      data-score={cat.score}
    >
      <Image
        src={cat.img}
        alt={cat.label}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
      <span className="font-mono tnum">{count}</span>
    </span>
  );
}

/** Four cats to rate a restaurant; pressing my current cat again takes the rating back */
export function RatingPicker({
  mine,
  avg,
  count,
  onRate,
  compact = false,
}: {
  mine: number;
  avg: number | null;
  count: number;
  onRate: (score: number) => void;
  compact?: boolean;
}) {
  const size = compact ? 40 : 52;
  return (
    <div data-testid="rating-picker">
      <div className="mb-2 flex items-baseline justify-between gap-2 text-xs text-fg-3">
        <span>{mine ? "ให้คะแนนแล้ว กดรูปเดิมเพื่อยกเลิก" : "ให้คะแนนร้านนี้"}</span>
        {avg != null && count > 0 && (
          <span data-testid="rating-avg">
            เฉลี่ย {ratingFor(avg).label} · {count} คน
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {RATINGS.map((r) => {
          const on = mine === r.score;
          return (
            <button
              key={r.score}
              type="button"
              aria-pressed={on}
              aria-label={`ให้คะแนน ${r.label}`}
              onClick={() => onRate(on ? 0 : r.score)}
              className={`flex flex-col items-center gap-1 rounded-xl border p-1.5 text-[11px] transition-[background-color,border-color,opacity] ${
                on
                  ? "border-ember/60 bg-ember-soft text-ember-ink"
                  : mine
                    ? "border-line text-fg-3 opacity-60 hover:opacity-100"
                    : "border-line text-fg-2 hover:bg-raised"
              }`}
            >
              <Image
                src={r.img}
                alt=""
                width={size}
                height={size}
                className="rounded-lg object-cover"
                style={{ width: size, height: size }}
              />
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
