"use client";

import { Minus, Plus } from "lucide-react";

type Props = {
  /** my own vote: -1, 0 or 1 */
  mine: number;
  /** everyone's votes added up */
  net: number;
  downLabel: string;
  upLabel: string;
  /** who voted, shown on hover */
  title?: string;
  disabled?: boolean;
  onVote: (value: -1 | 0 | 1) => void;
};

/** − net + : pressing the same side again takes the vote back */
export function VoteControl({ mine, net, downLabel, upLabel, title, disabled, onVote }: Props) {
  return (
    <div className="flex shrink-0 items-center rounded-lg border border-line bg-deep p-0.5" title={title}>
      <button
        type="button"
        disabled={disabled}
        aria-label={downLabel}
        aria-pressed={mine === -1}
        onClick={() => onVote(mine === -1 ? 0 : -1)}
        className={`grid size-8 place-items-center rounded-md transition-colors disabled:opacity-40 ${
          mine === -1 ? "bg-raised text-bad" : "text-fg-3 hover:text-fg"
        }`}
      >
        <Minus size={16} strokeWidth={1.5} />
      </button>
      <span
        data-testid="vote-net"
        className={`w-6 text-center font-mono text-xs tnum ${net > 0 ? "text-ember-ink" : net < 0 ? "text-fg-3" : "text-fg-2"}`}
      >
        {net > 0 ? `+${net}` : net}
      </span>
      <button
        type="button"
        disabled={disabled}
        aria-label={upLabel}
        aria-pressed={mine === 1}
        onClick={() => onVote(mine === 1 ? 0 : 1)}
        className={`grid size-8 place-items-center rounded-md transition-colors disabled:opacity-40 ${
          mine === 1 ? "bg-raised text-ember-ink" : "text-fg-3 hover:text-fg"
        }`}
      >
        <Plus size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}

export function votersTitle(who?: { up: string[]; down: string[] }) {
  if (!who || (!who.up.length && !who.down.length)) return undefined;
  return [...who.up.map((n) => `+ ${n}`), ...who.down.map((n) => `− ${n}`)].join("\n");
}
