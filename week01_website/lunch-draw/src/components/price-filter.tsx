"use client";

import { PRICE_LEVELS, PRICE_UNKNOWN } from "@/lib/odds";

const OPTIONS = [
  ...PRICE_LEVELS.map((p) => ({ value: p.level as number, label: p.label as string, hint: `${p.hint} บาท` })),
  { value: PRICE_UNKNOWN, label: "ไม่ระบุ", hint: "ร้านที่ยังไม่มีใครใส่ราคา" },
];

/** Multi-select price range. Nothing selected = every price. */
export function PriceFilter({ value, onChange }: { value: number[]; onChange: (next: number[]) => void }) {
  const toggle = (v: number) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v].sort((a, b) => a - b));

  return (
    <fieldset className="mt-3 rounded-xl border border-line bg-deep px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <legend className="text-sm">ช่วงราคาต่อคน</legend>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-xs text-fg-3 hover:text-fg">
            ทุกราคา
          </button>
        )}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1">
        {OPTIONS.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              title={o.hint}
              aria-pressed={on}
              onClick={() => toggle(o.value)}
              className={`h-9 rounded-lg border text-xs transition-colors ${
                on
                  ? "border-ember/50 bg-ember-soft text-ember-ink"
                  : "border-line text-fg-2 hover:bg-raised hover:text-fg"
              } ${o.value === PRICE_UNKNOWN ? "" : "font-mono"}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-fg-3">
        {value.length === 0
          ? "ทุกราคา · ฿ ไม่เกิน 60 · ฿฿ 60–120 · ฿฿฿ 120–250 · ฿฿฿฿ 250 ขึ้นไป (บาทต่อคน)"
          : OPTIONS.filter((o) => value.includes(o.value))
              .map((o) => (o.value === PRICE_UNKNOWN ? "ไม่ระบุราคา" : o.hint))
              .join(" · ")}
      </p>
    </fieldset>
  );
}
