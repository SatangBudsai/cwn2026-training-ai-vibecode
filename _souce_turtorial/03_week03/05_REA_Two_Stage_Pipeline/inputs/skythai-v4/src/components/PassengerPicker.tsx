"use client";
import { useState } from "react";
import { MAX_PAX, paxErrors, totalPax, type Pax } from "@/lib/passengers";
import { useDismiss } from "./ui";

const ROWS: { key: keyof Pax; label: string; hint?: string; min: number }[] = [
  { key: "adults", label: "ผู้ใหญ่", min: 1 },
  { key: "children", label: "เด็ก", hint: "อายุ 2-11 ปี", min: 0 },
  { key: "infantsSeat", label: "ทารก", hint: "มีที่นั่งของตนเอง", min: 0 },
  { key: "infantsLap", label: "ทารก", hint: "นั่งบนตัก", min: 0 },
];

export function PassengerPicker({ value, onChange, align }: { value: Pax; onChange: (p: Pax) => void; align?: "right" }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Pax>(value);
  const ref = useDismiss(open, () => setOpen(false)); // closing without "เสร็จ" discards the draft
  const errs = paxErrors(draft);
  const total = totalPax(value);

  return (
    <div className="chip-wrap" ref={ref}>
      <button type="button" className="select-pill" data-testid="pax-button" aria-label={`ผู้โดยสาร ${total} คน`}
        onClick={() => { setDraft(value); setOpen((o) => !o); }}>
        👤 {total} ▾
      </button>
      {open && (
        <div className={`popover ${align === "right" ? "right" : ""}`} data-testid="pax-popover">
          {ROWS.map((r) => (
            <div className="pax-row" key={r.key}>
              <div>{r.label}{r.hint && <small>{r.hint}</small>}</div>
              <div className="counter">
                <button type="button" aria-label={`นำ${r.label}${r.hint ?? ""}ออก`} data-testid={`pax-${r.key}-minus`}
                  disabled={draft[r.key] <= r.min} onClick={() => setDraft({ ...draft, [r.key]: draft[r.key] - 1 })}>−</button>
                <output data-testid={`pax-${r.key}-count`}>{draft[r.key]}</output>
                <button type="button" aria-label={`เพิ่ม${r.label}${r.hint ?? ""}`} data-testid={`pax-${r.key}-plus`}
                  disabled={draft[r.key] >= MAX_PAX} onClick={() => setDraft({ ...draft, [r.key]: draft[r.key] + 1 })}>+</button>
              </div>
            </div>
          ))}
          {errs.map((e) => <div key={e} className="pax-error" role="alert" data-testid="pax-error">{e}</div>)}
          {errs.length === 0 && ( /* C4: Done/Cancel are hidden while the selection is invalid */
            <div className="popover-actions">
              <button type="button" className="btn-link" data-testid="pax-cancel" onClick={() => setOpen(false)}>ยกเลิก</button>
              <button type="button" className="btn-secondary" data-testid="pax-done" onClick={() => { onChange(draft); setOpen(false); }}>เสร็จ</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
