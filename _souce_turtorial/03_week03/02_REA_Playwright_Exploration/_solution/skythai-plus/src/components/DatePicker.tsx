"use client";
import { useState } from "react";
import { addDays, fmtShort, isSelectableDate, maxTravelDate, monthTitle, parseISO, toISO, WEEKDAY_HEADERS } from "@/lib/dates";
import { useDismiss } from "./ui";

function Month({ year, month0, value, today, min, onPick }: { year: number; month0: number; value: string; today: string; min: string; onPick: (d: string) => void }) {
  const ok = (iso: string) => iso >= min && isSelectableDate(iso, today);
  const first = new Date(Date.UTC(year, month0, 1));
  const days = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let d = 1; d <= days; d++) cells.push(toISO(new Date(Date.UTC(year, month0, d))));
  return (
    <div className="cal-month">
      <h5>{monthTitle(year, month0)}</h5>
      <div className="cal-grid">
        {WEEKDAY_HEADERS.map((w) => <div key={w} className="wd">{w}</div>)}
        {cells.map((iso, i) => iso === null ? <div key={`e${i}`} /> : (
          <button key={iso} type="button" data-testid={`cal-day-${iso}`} data-iso={iso}
            className={`cal-day ${iso === value ? "sel" : ""} ${iso === today ? "today" : ""}`}
            disabled={!ok(iso)} /* C6 */
            aria-hidden={!ok(iso) || undefined}
            onClick={() => onPick(iso)}>
            {parseISO(iso).getUTCDate()}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DatePicker({ label, value, onChange, today, testId, minDate }: {
  label: string; value: string; onChange: (d: string) => void; today: string; testId: string; minDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const base = parseISO(value || today);
  const [view, setView] = useState({ y: base.getUTCFullYear(), m: base.getUTCMonth() });
  const ref = useDismiss(open, () => setOpen(false));
  const lo = minDate && minDate > today ? minDate : today;
  const canPrevDay = !!value && addDays(value, -1) >= lo;
  const canNextDay = !!value && addDays(value, 1) <= maxTravelDate(today);
  const t = parseISO(today);
  const canPrevMonth = view.y * 12 + view.m > t.getUTCFullYear() * 12 + t.getUTCMonth();
  const mx = parseISO(maxTravelDate(today));
  const canNextMonth = view.y * 12 + view.m + 1 < mx.getUTCFullYear() * 12 + mx.getUTCMonth();
  const next = view.m === 11 ? { y: view.y + 1, m: 0 } : { y: view.y, m: view.m + 1 };
  const shift = (n: number) => setView(({ y, m }) => { const k = y * 12 + m + n; return { y: Math.floor(k / 12), m: k % 12 }; });

  return (
    <div className="field date-field" ref={ref}>
      <button type="button" className="step-btn" aria-label={`${label} วันก่อนหน้า`} data-testid={`${testId}-prev`} disabled={!canPrevDay}
        onClick={() => onChange(addDays(value, -1))}>‹</button>
      <button type="button" className="field-btn" data-testid={testId} aria-label={`${label}, ${value ? fmtShort(value) : "ยังไม่ได้เลือก"}`}
        onClick={() => { setDraft(value); const b = parseISO(value || today); setView({ y: b.getUTCFullYear(), m: b.getUTCMonth() }); setOpen((o) => !o); }}>
        <span className="lbl">{label}</span>
        <span className={`val ${value ? "" : "placeholder"}`} data-testid={`${testId}-value`}>{value ? fmtShort(value) : "เลือกวันที่"}</span>
      </button>
      <button type="button" className="step-btn" aria-label={`${label} วันถัดไป`} data-testid={`${testId}-next`} disabled={!canNextDay}
        onClick={() => onChange(addDays(value, 1))}>›</button>
      {open && (
        <div className="popover right" data-testid={`${testId}-calendar`}>
          <div className="cal-head">
            <button type="button" className="icon-btn" aria-label="เดือนก่อนหน้า" disabled={!canPrevMonth} onClick={() => shift(-1)}>‹</button>
            <b>{draft ? `${label}: ${fmtShort(draft)}` : label}</b>
            <button type="button" className="icon-btn" aria-label="เดือนถัดไป" disabled={!canNextMonth} onClick={() => shift(1)}>›</button>
          </div>
          <div className="cal">
            <Month year={view.y} month0={view.m} value={draft} today={today} min={lo} onPick={setDraft} />
            <Month year={next.y} month0={next.m} value={draft} today={today} min={lo} onPick={setDraft} />
          </div>
          <p className="sub" style={{ margin: "8px 0 0" }}>ข้อมูลจำลองไม่มีราคารายวันในปฏิทิน · ราคาจริงดูได้ในผลการค้นหา</p>
          <div className="popover-actions">
            <button type="button" className="btn-link" data-testid={`${testId}-reset`} onClick={() => setDraft("")}>รีเซ็ต</button>
            <button type="button" className="btn-secondary" data-testid={`${testId}-done`} disabled={!draft}
              onClick={() => { onChange(draft); setOpen(false); }}>เสร็จ</button>
          </div>
        </div>
      )}
    </div>
  );
}
