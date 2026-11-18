"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CABINS } from "@/lib/passengers";
import { RETURN_GAP_DAYS, searchErrors, searchQuery, type SearchState, type TripType } from "@/lib/search";
import { addDays } from "@/lib/dates";
import { DatePicker } from "./DatePicker";
import { PassengerPicker } from "./PassengerPicker";
import { PlacePicker } from "./PlacePicker";

interface Row { from: string; to: string; date: string }

// compact = results-page variant: flat bar, search button shown on the ticket-type row (CSS)
export function SearchForm({ initial, today, prices, compact = false }: { initial: SearchState; today: string; prices?: Record<string, number>; compact?: boolean }) {
  const router = useRouter();
  const [s, setS] = useState<SearchState>(initial);
  const [extra, setExtra] = useState<Row[]>([]); // multi-city rows after the first one
  const [errors, setErrors] = useState<string[]>([]);
  const set = (patch: Partial<SearchState>) => { setS((o) => ({ ...o, ...patch })); setErrors([]); };

  const changeTrip = (trip: TripType) => {
    // C27: the chosen date stays when the ticket type changes
    if (trip === "multicity" && extra.length === 0) setExtra([{ from: s.to, to: "", date: s.date ? addDays(s.date, 1) : "" }]);
    set(trip === "roundtrip" && !s.ret && s.date ? { trip, ret: addDays(s.date, RETURN_GAP_DAYS) } : { trip });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = searchErrors(s, today); // C28, C29, C6
    if (s.trip === "multicity") extra.forEach((r, i) => {
      if (!r.from || !r.to || !r.date) errs.push(`เที่ยวบินที่ ${i + 2}: กรอกต้นทาง ปลายทาง และวันที่ให้ครบ`);
    });
    if (errs.length) { setErrors(errs); return; }
    router.push(`/search?${searchQuery(s)}`);
  };

  const swap = () => set({ from: s.to, to: s.from }); // date is kept

  return (
    <form className={`search-card${compact ? " search-bar" : ""}`} role="search" aria-label="การค้นหาเที่ยวบิน"
      onSubmit={submit} data-testid="search-form" noValidate>
      <div className="search-top">
        <select className="select-pill" aria-label="เปลี่ยนประเภทตั๋ว" data-testid="trip-type" value={s.trip}
          onChange={(e) => changeTrip(e.target.value as TripType)}>
          <option value="roundtrip">⇄ ไป-กลับ</option>
          <option value="oneway">→ เที่ยวเดียว</option>
          <option value="multicity">⇶ หลายเมือง</option>
        </select>
        <PassengerPicker value={s.pax} onChange={(pax) => set({ pax })} />
        <select className="select-pill" aria-label="เปลี่ยนชั้นโดยสาร" data-testid="cabin-class" value={s.cabin}
          onChange={(e) => set({ cabin: e.target.value })}>
          {CABINS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      <div className="search-grid">
        <PlacePicker label="ต้นทาง" value={s.from} onChange={(from) => set({ from })} testId="origin" />
        <button type="button" className="swap-btn" aria-label="สลับต้นทางกับปลายทาง" data-testid="swap-button"
          disabled={!s.to} /* C5 */ onClick={swap}>⇄</button>
        <PlacePicker label="ปลายทาง" value={s.to} onChange={(to) => set({ to })} testId="destination" />
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <DatePicker label="ขาไป" value={s.date} prices={prices}
              onChange={(date) => set(s.ret && s.ret < date ? { date, ret: addDays(date, RETURN_GAP_DAYS) } : { date })} today={today} testId="depart-date" />
          </div>
          {s.trip === "roundtrip" && (
            <div style={{ flex: 1 }}>
              <DatePicker label="ขากลับ" value={s.ret} minDate={s.date} onChange={(ret) => set({ ret })} today={today} testId="return-date" />
            </div>
          )}
        </div>
      </div>

      {s.trip === "multicity" && (
        <div data-testid="multicity-rows">
          {extra.map((r, i) => (
            <div className="search-grid multi" key={i} style={{ marginTop: 10 }}>
              <PlacePicker label={`ต้นทาง (${i + 2})`} value={r.from} testId={`mc-origin-${i}`}
                onChange={(from) => setExtra(extra.map((x, j) => (j === i ? { ...x, from } : x)))} />
              <span />
              <PlacePicker label={`ปลายทาง (${i + 2})`} value={r.to} testId={`mc-destination-${i}`}
                onChange={(to) => setExtra(extra.map((x, j) => (j === i ? { ...x, to } : x)))} />
              <DatePicker label="วันที่" value={r.date} today={today} testId={`mc-date-${i}`}
                onChange={(date) => setExtra(extra.map((x, j) => (j === i ? { ...x, date } : x)))} />
              <button type="button" className="icon-btn" aria-label="ลบเที่ยวบิน" data-testid={`mc-remove-${i}`}
                onClick={() => setExtra(extra.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          {extra.length < 4 && (
            <button type="button" className="btn-link" data-testid="mc-add" onClick={() => setExtra([...extra, { from: "", to: "", date: "" }])}>
              + เพิ่มเที่ยวบิน
            </button>
          )}
        </div>
      )}

      {s.trip !== "oneway" && (
        <div className="notice notice-info" data-testid="trip-type-note">
          ข้อมูลจำลองมีเฉพาะเที่ยวบินขาไปกรุงเทพ → โตเกียว ผลการค้นหาจะแสดงและจองได้เฉพาะเที่ยวบินขาแรกแบบเที่ยวเดียว
        </div>
      )}

      {errors.length > 0 && (
        <div className="notice notice-error form-errors" role="alert" data-testid="search-errors">
          <div>{errors.map((e) => <div key={e}>• {e}</div>)}</div>
        </div>
      )}

      <div className="search-actions">
        <button type="submit" className="btn-primary" data-testid="search-button">🔍 ค้นหาเที่ยวบิน</button>
      </div>
    </form>
  );
}
