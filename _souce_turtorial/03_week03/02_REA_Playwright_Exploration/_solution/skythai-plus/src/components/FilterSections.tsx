"use client";
import type { AirlineOpt, AirportOpt } from "@/lib/types";
import { baht } from "@/lib/format";
import { fmtDuration } from "@/lib/dates";
import { Switch } from "./ui";
import type { Filters } from "./filters";

export type FilterKind = "stops" | "airlines" | "bags" | "price" | "times" | "emissions" | "connecting" | "duration";

export interface FilterCtx {
  f: Filters;
  set: (patch: Partial<Filters>) => void;
  airlines: AirlineOpt[];
  connecting: AirportOpt[];
  maxBags: number;
  priceCeil: number;
  layoverCeil: number;
  durationCeilH: number;
}

const ALLIANCES = [{ code: "ONEWORLD", name: "Oneworld" }, { code: "SKYTEAM", name: "SkyTeam" }, { code: "STAR_ALLIANCE", name: "Star Alliance" }];
const hh = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;

function HourRange({ label, value, onChange, testId }: { label: string; value: [number, number]; onChange: (v: [number, number]) => void; testId: string }) {
  return (
    <div className="range-row">
      <div>{label}: <b data-testid={`${testId}-label`}>{value[0] === 0 && value[1] === 24 ? "ทุกเวลา" : `${hh(value[0])} – ${value[1] === 24 ? "00:00" : hh(value[1])}`}</b></div>
      {/* C18: earliest can go up to 23, latest is always at least earliest + 1 */}
      <input type="range" min={0} max={23} step={1} value={value[0]} aria-label={`${label} เร็วที่สุด`} data-testid={`${testId}-min`}
        onChange={(e) => { const a = Number(e.target.value); onChange([a, Math.max(value[1], a + 1)]); }} />
      <input type="range" min={1} max={24} step={1} value={value[1]} aria-label={`${label} ช้าที่สุด`} data-testid={`${testId}-max`}
        onChange={(e) => { const b = Number(e.target.value); onChange([Math.min(value[0], b - 1), b]); }} />
    </div>
  );
}

export function FilterSection({ kind, ctx }: { kind: FilterKind; ctx: FilterCtx }) {
  const { f, set } = ctx;
  switch (kind) {
    case "stops":
      return (
        <div className="radio-list" data-testid="filter-stops">
          <h4>จำนวนครั้งที่แวะพัก</h4>
          {([["any", "จำนวนครั้งที่แวะพักเท่าใดก็ได้"], ["0", "บินตรงเท่านั้น"], ["1", "แวะพัก 1 ครั้งหรือน้อยกว่า"], ["2", "แวะพัก 2 ครั้งหรือน้อยกว่า"]] as const).map(([v, l]) => (
            <label key={v}><input type="radio" name="stops" checked={f.stops === v} data-testid={`stops-${v}`} onChange={() => set({ stops: v })} />{l}</label>
          ))}
        </div>
      );
    case "airlines": {
      const all = ctx.airlines.map((a) => a.code);
      const sel = f.airlines ?? all;
      const toggle = (codes: string[], on: boolean) => {
        const next = on ? Array.from(new Set([...sel, ...codes])) : sel.filter((c) => !codes.includes(c));
        set({ airlines: next.length === all.length ? null : next });
      };
      return (
        <div data-testid="filter-airlines">
          <h4>สายการบิน</h4>
          <div className="switch-row"><span>เลือกสายการบินทั้งหมด</span>
            <Switch on={f.airlines === null} label="เลือกสายการบินทั้งหมด" testId="airlines-all"
              onToggle={() => set({ airlines: f.airlines === null ? [] : null })} /></div>
          <div className="check-list" style={{ maxHeight: "none" }}>
            <div className="sub">พันธมิตร</div>
            {ALLIANCES.map((al) => {
              const members = ctx.airlines.filter((a) => a.alliance === al.code).map((a) => a.code);
              if (members.length === 0) return null;
              const on = members.every((c) => sel.includes(c));
              return <label key={al.code}><input type="checkbox" checked={on} data-testid={`alliance-${al.code}`} onChange={() => toggle(members, !on)} />{al.name}</label>;
            })}
          </div>
          <div className="check-list">
            <div className="sub">สายการบิน</div>
            {ctx.airlines.map((a) => (
              <label key={a.code}>
                <input type="checkbox" checked={sel.includes(a.code)} data-testid={`airline-${a.code}`} onChange={() => toggle([a.code], !sel.includes(a.code))} />
                {a.name} <span className="sub">({a.code})</span>
                <button type="button" className="btn-link only" data-testid={`airline-only-${a.code}`} onClick={(e) => { e.preventDefault(); set({ airlines: [a.code] }); }}>เท่านั้น</button>
              </label>
            ))}
          </div>
        </div>
      );
    }
    case "bags":
      return (
        <div data-testid="filter-bags">
          <h4>สัมภาระ</h4>
          <div className="pax-row"><div>กระเป๋าถือขึ้นเครื่อง</div>
            <div className="counter">
              <button type="button" aria-label="ลดกระเป๋าถือ" data-testid="bags-minus" disabled={f.bags <= 0} onClick={() => set({ bags: f.bags - 1 })}>−</button>
              <output data-testid="bags-count">{f.bags}</output>
              <button type="button" aria-label="เพิ่มกระเป๋าถือ" data-testid="bags-plus" disabled={f.bags >= ctx.maxBags} /* C17 */ onClick={() => set({ bags: f.bags + 1 })}>+</button>
            </div></div>
          <p className="sub">ข้อมูลจำลองไม่มีข้อมูลสัมภาระรายเที่ยวบิน ตัวกรองนี้จึงยังไม่ตัดรายการใดออก</p>
        </div>
      );
    case "price": {
      const v = f.maxPrice ?? ctx.priceCeil;
      return (
        <div className="range-row" data-testid="filter-price">
          <h4>ราคา</h4>
          <div>{f.maxPrice === null ? "ราคาทั้งหมด" : <>สูงสุด <b>{baht(v)}</b></>}</div>
          {/* C19: steps of ฿10,000, never below ฿10,000 */}
          <input type="range" min={10000} max={ctx.priceCeil} step={10000} value={v} aria-label="ราคาสูงสุด" data-testid="price-slider"
            onChange={(e) => { const n = Number(e.target.value); set({ maxPrice: n >= ctx.priceCeil ? null : n }); }} />
        </div>
      );
    }
    case "times":
      return (
        <div data-testid="filter-times">
          <h4>เวลา</h4>
          <HourRange label="ออกเดินทาง" value={f.dep} onChange={(dep) => set({ dep })} testId="dep" />
          <HourRange label="มาถึง" value={f.arr} onChange={(arr) => set({ arr })} testId="arr" />
        </div>
      );
    case "emissions":
      return (
        <div className="radio-list" data-testid="filter-emissions">
          <h4>การปล่อยก๊าซ</h4>
          <label><input type="radio" name="em" checked={f.emissions === "all"} data-testid="emissions-all" onChange={() => set({ emissions: "all" })} />การปล่อยก๊าซทุกระดับ</label>
          <label><input type="radio" name="em" checked={f.emissions === "low"} data-testid="emissions-low" onChange={() => set({ emissions: "low" })} />การปล่อยก๊าซต่ำเท่านั้น</label>
        </div>
      );
    case "connecting": {
      const all = ctx.connecting.map((a) => a.code);
      const sel = f.connecting ?? all;
      const v = f.layoverMax ?? ctx.layoverCeil;
      const toggle = (code: string) => {
        const next = sel.includes(code) ? sel.filter((c) => c !== code) : [...sel, code];
        set({ connecting: next.length === all.length ? null : next });
      };
      return (
        <div data-testid="filter-connecting">
          <h4>สนามบินสำหรับต่อเครื่อง</h4>
          <div className="range-row">
            <div>ระยะเวลาแวะพัก: <b>{f.layoverMax === null ? "ทุกระยะเวลา" : `ไม่เกิน ${fmtDuration(v)}`}</b></div>
            <input type="range" min={30} max={ctx.layoverCeil} step={30} value={v} aria-label="ระยะเวลาแวะพักสูงสุด" data-testid="layover-slider"
              onChange={(e) => { const n = Number(e.target.value); set({ layoverMax: n >= ctx.layoverCeil ? null : n }); }} />
          </div>
          <div className="switch-row"><span>สนามบินสำหรับต่อเครื่องทั้งหมด</span>
            <Switch on={f.connecting === null} label="สนามบินสำหรับต่อเครื่องทั้งหมด" testId="connecting-all" onToggle={() => set({ connecting: f.connecting === null ? [] : null })} /></div>
          <div className="check-list">
            {ctx.connecting.map((a) => (
              <label key={a.code}>
                <input type="checkbox" checked={sel.includes(a.code)} data-testid={`connect-${a.code}`} onChange={() => toggle(a.code)} />
                {a.code} <span className="sub">{a.city ?? ""}</span>
                <button type="button" className="btn-link only" data-testid={`connect-only-${a.code}`} onClick={(e) => { e.preventDefault(); set({ connecting: [a.code] }); }}>เท่านั้น</button>
              </label>
            ))}
          </div>
        </div>
      );
    }
    case "duration": {
      const v = f.maxDurationH ?? ctx.durationCeilH;
      return (
        <div className="range-row" data-testid="filter-duration">
          <h4>ระยะเวลา</h4>
          <div>ระยะเวลาบิน: <b>{f.maxDurationH === null ? "ทุกระยะเวลา" : `ไม่เกิน ${v} ชม.`}</b></div>
          <input type="range" min={5} max={ctx.durationCeilH} step={1} value={v} aria-label="ระยะเวลาบินสูงสุด" data-testid="duration-slider"
            onChange={(e) => { const n = Number(e.target.value); set({ maxDurationH: n >= ctx.durationCeilH ? null : n }); }} />
        </div>
      );
    }
  }
}

export function chipLabel(kind: FilterKind, ctx: FilterCtx): { label: string; active: boolean } {
  const { f } = ctx;
  switch (kind) {
    case "stops": return f.stops === "any" ? { label: "จำนวนครั้งที่แวะพัก", active: false }
      : { label: f.stops === "0" ? "บินตรง" : `แวะพัก ≤ ${f.stops} ครั้ง`, active: true };
    case "airlines": {
      if (!f.airlines) return { label: "สายการบิน", active: false };
      if (f.airlines.length === 1) return { label: ctx.airlines.find((a) => a.code === f.airlines![0])?.name ?? f.airlines[0], active: true };
      return { label: `สายการบิน (${f.airlines.length})`, active: true };
    }
    case "bags": return f.bags ? { label: `กระเป๋าถือขึ้นเครื่อง ${f.bags} ใบ`, active: true } : { label: "สัมภาระ", active: false };
    case "price": return f.maxPrice === null ? { label: "ราคา", active: false } : { label: `สูงสุด ${baht(f.maxPrice)}`, active: true };
    case "times": {
      const on = f.dep[0] !== 0 || f.dep[1] !== 24 || f.arr[0] !== 0 || f.arr[1] !== 24;
      return { label: on ? `ออก ${hh(f.dep[0])}–${f.dep[1] === 24 ? "00:00" : hh(f.dep[1])}` : "เวลา", active: on };
    }
    case "emissions": return f.emissions === "low" ? { label: "การปล่อยก๊าซต่ำ", active: true } : { label: "การปล่อยก๊าซ", active: false };
    case "connecting": {
      const on = f.layoverMax !== null || f.connecting !== null;
      return { label: on ? (f.connecting?.length === 1 ? `ต่อเครื่องที่ ${f.connecting[0]}` : "สนามบินต่อเครื่อง (กรอง)") : "สนามบินสำหรับต่อเครื่อง", active: on };
    }
    case "duration": return f.maxDurationH === null ? { label: "ระยะเวลา", active: false } : { label: `ไม่เกิน ${f.maxDurationH} ชม.`, active: true };
  }
}

export function clearPatch(kind: FilterKind): Partial<Filters> {
  switch (kind) {
    case "stops": return { stops: "any" };
    case "airlines": return { airlines: null };
    case "bags": return { bags: 0 };
    case "price": return { maxPrice: null };
    case "times": return { dep: [0, 24], arr: [0, 24] };
    case "emissions": return { emissions: "all" };
    case "connecting": return { layoverMax: null, connecting: null };
    case "duration": return { maxDurationH: null };
  }
}
