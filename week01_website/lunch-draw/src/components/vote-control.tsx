"use client";

type Props = {
  /** my own vote: -1, 0 or 1 */
  mine: number;
  /** everyone's votes added up (shown in rooms only) */
  net: number;
  /** what is being voted on, read out by screen readers, e.g. "โหวต อาหารอีสาน" */
  groupLabel: string;
  /** rooms: show the group total next to the switch */
  showNet?: boolean;
  /** who voted, shown on hover */
  title?: string;
  disabled?: boolean;
  /** chosen but not saved yet */
  pending?: boolean;
  onVote: (value: -1 | 0 | 1) => void;
};

const OPTIONS = [
  { value: -1, label: "ไม่เห็นด้วย", on: "bg-raised text-bad shadow-[inset_0_0_0_1px_rgb(229_72_77/0.45)]" },
  { value: 0, label: "ปกติ", on: "bg-raised text-fg shadow-[inset_0_0_0_1px_rgb(237_237_237/0.14)]" },
  { value: 1, label: "เห็นด้วย", on: "bg-ember-soft text-ember-ink shadow-[inset_0_0_0_1px_rgb(240_136_62/0.5)]" },
] as const;

/** Three-way switch: ไม่เห็นด้วย | ปกติ | เห็นด้วย. Exactly one is always selected. */
export function VoteControl({ mine, net, groupLabel, showNet, title, disabled, pending, onVote }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-2" title={title}>
      <div
        role="radiogroup"
        aria-label={groupLabel}
        data-pending={pending ? "true" : undefined}
        className={`flex items-center rounded-lg border bg-deep p-0.5 transition-colors ${
          pending ? "border-dashed border-ember/60" : "border-line"
        }`}
      >
        {OPTIONS.map((o) => {
          const on = mine === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              onClick={() => !on && onVote(o.value)}
              className={`h-8 rounded-md px-2.5 text-xs whitespace-nowrap transition-colors disabled:opacity-40 ${
                on ? o.on : "text-fg-3 hover:text-fg"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {showNet && (
        <span
          data-testid="vote-net"
          title="ผลโหวตรวมของทุกคนในห้อง"
          className={`w-12 text-right font-mono text-xs tnum ${net > 0 ? "text-ember-ink" : net < 0 ? "text-bad" : "text-fg-3"}`}
        >
          รวม {net > 0 ? `+${net}` : net}
        </span>
      )}
    </div>
  );
}

export function votersTitle(who?: { up: string[]; down: string[] }) {
  if (!who || (!who.up.length && !who.down.length)) return undefined;
  return [...who.up.map((n) => `เห็นด้วย: ${n}`), ...who.down.map((n) => `ไม่เห็นด้วย: ${n}`)].join("\n");
}
