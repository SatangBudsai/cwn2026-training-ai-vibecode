"use client";

import { Minus, Plus } from "lucide-react";
import { categoryMultiplier, type CategoryScores } from "@/lib/odds";

export type Category = { id: string; label: string };

type Props = {
  categories: Category[];
  counts: Record<string, number>; // restaurants per category in the current pool
  myVotes: Record<string, number>;
  scores: CategoryScores; // net votes of everyone
  voters?: Record<string, { up: string[]; down: string[] }>;
  disabled?: boolean;
  onVote: (categoryId: string, value: -1 | 0 | 1) => void;
};

export function CategoryVotes({ categories, counts, myVotes, scores, voters, disabled, onVote }: Props) {
  return (
    <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      {categories.map((c) => {
        const mine = myVotes[c.id] ?? 0;
        const net = scores[c.id] ?? 0;
        const mult = categoryMultiplier(net);
        const who = voters?.[c.id];
        return (
          <li
            key={c.id}
            className={`flex h-11 items-center gap-2 rounded-lg px-2 transition-colors ${
              net > 0 ? "bg-ember-soft" : net < 0 ? "bg-deep" : "hover:bg-raised/60"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className={`truncate text-sm ${net < 0 ? "text-fg-3 line-through decoration-fg-3/50" : "text-fg"}`}>
                {c.label}
              </div>
              <div className="truncate font-mono text-[11px] text-fg-3 tnum">
                {counts[c.id] ?? 0} ร้าน · ×{mult.toFixed(1)}
                {who && (who.up.length > 0 || who.down.length > 0) && (
                  <span title={[...who.up.map((n) => `+ ${n}`), ...who.down.map((n) => `− ${n}`)].join("\n")}>
                    {" "}· {who.up.length > 0 && `+${who.up.length}`}
                    {who.up.length > 0 && who.down.length > 0 && " "}
                    {who.down.length > 0 && `−${who.down.length}`}
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center rounded-lg border border-line bg-deep p-0.5">
              <button
                type="button"
                disabled={disabled}
                aria-label={`ไม่อยากกิน${c.label}`}
                aria-pressed={mine === -1}
                onClick={() => onVote(c.id, mine === -1 ? 0 : -1)}
                className={`grid size-8 place-items-center rounded-md transition-colors disabled:opacity-40 ${
                  mine === -1 ? "bg-raised text-bad" : "text-fg-3 hover:text-fg"
                }`}
              >
                <Minus size={16} strokeWidth={1.5} />
              </button>
              <span
                className={`w-6 text-center font-mono text-xs tnum ${net > 0 ? "text-ember-ink" : net < 0 ? "text-fg-3" : "text-fg-2"}`}
              >
                {net > 0 ? `+${net}` : net}
              </span>
              <button
                type="button"
                disabled={disabled}
                aria-label={`อยากกิน${c.label}`}
                aria-pressed={mine === 1}
                onClick={() => onVote(c.id, mine === 1 ? 0 : 1)}
                className={`grid size-8 place-items-center rounded-md transition-colors disabled:opacity-40 ${
                  mine === 1 ? "bg-raised text-ember-ink" : "text-fg-3 hover:text-fg"
                }`}
              >
                <Plus size={16} strokeWidth={1.5} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
