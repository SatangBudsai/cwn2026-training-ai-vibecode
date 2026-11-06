"use client";

import { VoteControl, votersTitle } from "./vote-control";
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
            data-testid={`cat-${c.id}`}
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
            <VoteControl
              mine={mine}
              net={net}
              downLabel={`ไม่อยากกิน${c.label}`}
              upLabel={`อยากกิน${c.label}`}
              title={votersTitle(who)}
              disabled={disabled}
              onVote={(v) => onVote(c.id, v)}
            />
          </li>
        );
      })}
    </ul>
  );
}
