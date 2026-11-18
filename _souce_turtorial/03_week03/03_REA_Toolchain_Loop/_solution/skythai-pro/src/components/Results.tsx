"use client";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { addDays, fmtDayMonth, fmtShort, isSelectableDate } from "@/lib/dates";
import { baht } from "@/lib/format";
import { seatedPax, type Pax } from "@/lib/passengers";
import { totalFor } from "@/lib/pricing";
import { DEFAULT_SORT, type SortKey } from "@/lib/search";
import type { AirlineOpt, AirportOpt, FlightView, Insights, StepId } from "@/lib/types";
import { activeCount, EMPTY_FILTERS, passes, type Filters } from "./filters";
import { chipLabel, clearPatch, FilterSection, type FilterCtx, type FilterKind } from "./FilterSections";
import { FlightRow } from "./FlightRow";
import { InsightsBox, PriceChart } from "./Insights";
import { Modal, Switch, useDismiss } from "./ui";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "popular", label: "เที่ยวบินยอดนิยม" },
  { id: "price", label: "ราคา" },
  { id: "depart", label: "เวลาออกเดินทาง" },
  { id: "arrive", label: "เวลาถึง" },
  { id: "duration", label: "ระยะเวลา" },
  { id: "emissions", label: "การปล่อยก๊าซ" },
];
const CHIPS: FilterKind[] = ["stops", "airlines", "bags", "price", "times", "emissions", "connecting", "duration"];
/** "Popular" order inside the request that produced the list (F3 initial, F2 all, F4 nonstop). */
const orderIn = (f: FlightView, step: StepId) => f.seen[step]?.order ?? 10000 + f.displayOrder;
const groupIn = (f: FlightView, step: StepId) => f.seen[step]?.group ?? "other";

function sorter(sort: SortKey, step: StepId): (a: FlightView, b: FlightView) => number {
  const by = (k: (f: FlightView) => number | string) => (a: FlightView, b: FlightView) => {
    const x = k(a), y = k(b);
    return x < y ? -1 : x > y ? 1 : a.displayOrder - b.displayOrder;
  };
  switch (sort) {
    case "popular": return by((f) => orderIn(f, step));
    case "price": return by((f) => f.price);
    case "depart": return by((f) => `${f.departDate} ${f.departTime}`);
    case "arrive": return by((f) => `${f.arriveDate} ${f.arriveTime}`);
    case "duration": return by((f) => f.durationMin);
    case "emissions": return by((f) => f.co2.g);
  }
}

export interface ResultsProps {
  flights: FlightView[];
  insights: Insights | null;
  cheaper: { date: string; price: number } | null;
  airlines: AirlineOpt[];
  connecting: AirportOpt[];
  pax: Pax;
  date: string;
  today: string;
  query: string;          // current search query string (without date for date changes)
  queryNoDate: string;
  layoverCeil: number;
  durationCeilMin: number;
  moreInSource: number | null;
}

export function Results(p: ResultsProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"best" | "cheapest">("best");
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [openChip, setOpenChip] = useState<FilterKind | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  // F2: "ดูเที่ยวบินเพิ่มเติม" loads every itinerary of the search at once — no paging
  const [loadedAll, setLoadedAll] = useState(false);
  const [modal, setModal] = useState<null | "rank" | "login" | "grid" | "chart">(null);
  const [gridPick, setGridPick] = useState(p.date);
  const [cheaperOpen, setCheaperOpen] = useState(true);
  const chipsRef = useDismiss(openChip !== null, () => setOpenChip(null));

  const total = (price: number) => totalFor(price, p.pax);
  const maxTotal = Math.max(0, ...p.flights.map((f) => total(f.price)));
  const ctx: FilterCtx = {
    f: filters, set: (patch) => setFilters((o) => ({ ...o, ...patch })),
    airlines: p.airlines, connecting: p.connecting, maxBags: seatedPax(p.pax),
    priceCeil: Math.max(20000, Math.ceil(maxTotal / 10000) * 10000 + 10000),
    layoverCeil: p.layoverCeil, durationCeilH: Math.ceil(p.durationCeilMin / 60),
  };

  const nActive = activeCount(filters);
  // F3: the first answer is the 22 itineraries of the initial request. F4: any filter is a new search over the
  // full result set (the source site re-queries the server), so filtered lists draw from all itineraries.
  const fullMode = loadedAll || nActive > 0;
  const initialSet = useMemo(() => p.flights.filter((f) => f.seen.initial), [p.flights]);
  const base = fullMode || initialSet.length === 0 ? p.flights : initialSet;
  const onlyNonstop = filters.stops === "0" && nActive === 1;
  const step: StepId = !fullMode && initialSet.length ? "initial" : onlyNonstop ? "nonstop_filter" : "more_flights";
  const filtered = useMemo(() => base.filter((f) => passes(f, filters, total)), [base, filters, p.pax]); // eslint-disable-line react-hooks/exhaustive-deps
  const minPrice = filtered.length ? Math.min(...filtered.map((f) => f.price)) : null;
  // C11: the chosen sort is kept for both tabs; "ถูกที่สุด" with the popular sort orders by price.
  const effectiveSort: SortKey = tab === "cheapest" && sort === "popular" ? "price" : sort;
  const sorted = [...filtered].sort(sorter(effectiveSort, step));
  const grouped = tab === "best" && sort === "popular";
  const visible = sorted;
  const canLoadMore = !fullMode && base.length < p.flights.length;
  const showTools = grouped; // C12
  // F7: the typical price range belongs to the request (all flights vs. nonstop only)
  const stepInfo = p.insights?.steps.find((x) => x.step === step) ?? p.insights?.steps.find((x) => x.step === "more_flights");
  const insights = p.insights && stepInfo && minPrice !== null
    ? { ...p.insights, lowestNow: minPrice, typicalLow: stepInfo.typicalLow, typicalHigh: stepInfo.typicalHigh, reference: stepInfo.reference }
    : null;

  const bookHref = (f: FlightView) => `/booking/${f.id}?${p.query}`;
  const toggle = useCallback((id: number) => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const select = useCallback((href: string) => router.push(href), [router]);
  const row = (f: FlightView) => (
    <FlightRow key={f.id} f={f} total={total(f.price)} cheapest={f.price === minPrice} expanded={expanded.has(f.id)}
      onToggle={toggle} bookHref={bookHref(f)} onSelect={select} />
  );
  const goDate = (d: string) => router.push(`/search?${p.queryNoDate}&date=${d}`);

  // date grid (C25): 8 days around the searched date, prices only where the mock data has them
  const gridDays = Array.from({ length: 8 }, (_, i) => addDays(p.date, i - 3));
  const gridPrice = (d: string) => (d === p.date && p.flights.length ? Math.min(...p.flights.map((f) => f.price)) : p.cheaper?.date === d ? p.cheaper.price : null);
  const gridMin = Math.min(...gridDays.map(gridPrice).filter((x): x is number => x !== null));

  const bestFirst = grouped ? visible.filter((f) => groupIn(f, step) === "best") : [];
  const others = grouped ? visible.filter((f) => groupIn(f, step) !== "best") : visible;

  return (
    <div data-testid="results">
      <div className="filters-bar" ref={chipsRef} data-testid="filter-chips">
        <button type="button" className={`chip ${nActive ? "active" : ""}`} data-testid="all-filters-button" onClick={() => setAllOpen(true)}>
          ☰ ตัวกรองทั้งหมด{nActive ? ` (${nActive})` : ""}
        </button>
        {CHIPS.map((k) => {
          const { label, active } = chipLabel(k, ctx);
          return (
            <div className="chip-wrap" key={k}>
              <span className={`chip ${active ? "active" : ""}`}>
                <button type="button" style={{ all: "unset", cursor: "pointer" }} data-testid={`chip-${k}`} aria-expanded={openChip === k}
                  onClick={() => setOpenChip(openChip === k ? null : k)}>{label} ▾</button>
                {active && <button type="button" className="x" aria-label={`ล้างตัวกรอง ${label}`} data-testid={`chip-clear-${k}`}
                  onClick={() => ctx.set(clearPatch(k))}>✕</button>}
              </span>
              {openChip === k && (
                <div className="popover" data-testid={`popover-${k}`} style={{ width: 340 }}>
                  <FilterSection kind={k} ctx={ctx} />
                  <div className="popover-actions">
                    <button type="button" className="btn-link" data-testid={`popover-clear-${k}`} onClick={() => ctx.set(clearPatch(k))}>ล้าง</button>
                    <button type="button" className="btn-secondary" onClick={() => setOpenChip(null)}>ปิด</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "best"} className={`tab ${tab === "best" ? "on" : ""}`} data-testid="tab-best" onClick={() => setTab("best")}>
          <span className="t">ดีที่สุด</span>
          <span role="button" tabIndex={0} aria-label="ดูข้อมูลเพิ่มเติมเกี่ยวกับการจัดอันดับ" data-testid="rank-info"
            onClick={(e) => { e.stopPropagation(); setModal("rank"); }}>ⓘ</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "cheapest"} className={`tab ${tab === "cheapest" ? "on" : ""}`} data-testid="tab-cheapest" onClick={() => setTab("cheapest")}>
          <span className="t">ถูกที่สุด</span>
          <small data-testid="cheapest-from">{minPrice !== null ? `เริ่มต้น ${baht(total(minPrice))}` : "—"}</small>
        </button>
      </div>

      <div className="track-row" data-testid="track-prices">
        <span>🔔 ติดตามราคา</span>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>{fmtDayMonth(p.date)}
          <Switch on={false} label={`ติดตามราคา ${fmtDayMonth(p.date)}`} testId="track-date" onToggle={() => setModal("login")} /></label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>วันใดก็ได้
          <Switch on={false} label="ติดตามราคาวันใดก็ได้" testId="track-any" onToggle={() => setModal("login")} /></label>
      </div>

      {showTools && insights && <InsightsBox key={step} i={insights} />}
      {showTools ? (
        <div className="tools-row">
          <button type="button" className="btn-secondary" data-testid="date-grid-button" onClick={() => { setGridPick(p.date); setModal("grid"); }}>📅 ตารางวันที่</button>
          <button type="button" className="btn-secondary" data-testid="price-graph-button" onClick={() => { setGridPick(p.date); setModal("chart"); }}>📈 กราฟราคา</button>
        </div>
      ) : (
        <p className="sub" data-testid="tools-hint">ข้อมูลเชิงลึกด้านราคาและตารางวันที่จะแสดงเมื่ออยู่แท็บ “ดีที่สุด” และเรียงตาม “เที่ยวบินยอดนิยม”</p>
      )}

      <div className="list-head">
        <div>
          <h3 data-testid="list-heading">{grouped ? "เที่ยวบินยอดนิยม" : "เที่ยวบินทั้งหมด"}</h3>
          <div className="list-sub" data-testid="price-note">
            {grouped ? "จัดอันดับตามราคาและความสะดวก · " : ""}
            ราคารวมภาษีที่ต้องจ่าย + ค่าธรรมเนียมสำหรับผู้โดยสาร {seatedPax(p.pax)} ท่าน อาจมีการเรียกเก็บเงินเพิ่มเติมและค่าธรรมเนียมสัมภาระ
          </div>
        </div>
        <label className="sub">จัดเรียงตาม{" "}
          <select className="sort-select" data-testid="sort-select" aria-label="เปลี่ยนลำดับการจัดเรียง" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <div className="sub" data-testid="result-count" style={{ marginBottom: 8 }}>มีผลลัพธ์ {filtered.length} รายการ</div>

      {filtered.length === 0 ? (
        <div className="empty" data-testid="no-results">
          <h3>ไม่พบผลลัพธ์</h3>
          <p>{p.flights.length === 0 ? "ไม่มีเที่ยวบินในข้อมูลจำลองสำหรับเส้นทางหรือชั้นโดยสารนี้" : "ไม่พบตัวเลือกที่ตรงกับตัวกรองของคุณ"}</p>
          {nActive > 0 && <button type="button" className="btn-secondary" data-testid="clear-all-filters" onClick={() => setFilters(EMPTY_FILTERS)}>ล้างตัวกรองทั้งหมด</button>}
        </div>
      ) : (
        <>
          {bestFirst.length > 0 && <div className="flight-list" data-testid="best-list">{bestFirst.map(row)}</div>}
          {grouped && others.length > 0 && <h3 style={{ color: "var(--navy)", margin: "18px 0 8px" }}>เที่ยวบินอื่นๆ</h3>}
          {others.length > 0 && <div className="flight-list" data-testid="flight-list">{others.map(row)}</div>}
          {canLoadMore && (
            <button type="button" className="btn-secondary more-btn" data-testid="load-more" onClick={() => setLoadedAll(true)}>
              ดูเที่ยวบินเพิ่มเติม
            </button>
          )}
          {loadedAll && nActive === 0 && (
            <p className="sub" style={{ textAlign: "center" }} data-testid="all-loaded-note">
              แสดงครบ {p.flights.length} เที่ยวบินของการค้นหานี้แล้ว (โหลดครั้งเดียว ไม่แบ่งหน้า)
            </p>
          )}
        </>
      )}

      {cheaperOpen && p.cheaper && isSelectableDate(p.cheaper.date, p.today) && p.cheaper.date !== p.date && (
        <div className="toast-card" data-testid="cheaper-date-card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <b>💡 เดินทางวันที่ {fmtDayMonth(p.cheaper.date)} ในราคา {baht(p.cheaper.price)}</b>
            <button type="button" className="icon-btn" aria-label="ปิด" data-testid="cheaper-date-close" onClick={() => setCheaperOpen(false)}>✕</button>
          </div>
          <div className="sub">ราคาจากข้อมูลจำลอง ณ วันที่เก็บ</div>
          <button type="button" className="btn-link" data-testid="cheaper-date-change" onClick={() => goDate(p.cheaper!.date)}>เปลี่ยนวันที่</button>
        </div>
      )}

      {allOpen && (
        <Modal title={`ตัวกรองทั้งหมด${nActive ? ` (${nActive})` : ""}`} onClose={() => setAllOpen(false)} testId="all-filters-panel">
          {CHIPS.map((k) => <div key={k} style={{ borderBottom: "1px solid var(--line)", padding: "10px 0" }}><FilterSection kind={k} ctx={ctx} /></div>)}
          <div className="switch-row" style={{ padding: "10px 0" }}>
            <span>ตั๋วแยกและตั๋วที่มีการเปลี่ยนเครื่องด้วยตนเอง: {filters.showSelfTransfer ? "แสดง" : "ซ่อน"}
              <br /><small className="sub">ข้อมูลจำลองไม่มีตั๋วประเภทนี้</small></span>
            <Switch on={filters.showSelfTransfer} label="แสดงตั๋วแยก" testId="self-transfer" onToggle={() => ctx.set({ showSelfTransfer: !filters.showSelfTransfer })} />
          </div>
          <div className="popover-actions">
            <button type="button" className="btn-link" data-testid="clear-all" onClick={() => setFilters(EMPTY_FILTERS)}>ล้างทั้งหมด</button>
            <button type="button" className="btn-primary" data-testid="all-filters-apply" onClick={() => setAllOpen(false)}>แสดง {filtered.length} เที่ยวบิน</button>
          </div>
        </Modal>
      )}

      {modal === "rank" && (
        <Modal title="การจัดอันดับเที่ยวบิน" onClose={() => setModal(null)} testId="rank-info-modal">
          <p>“ดีที่สุด” เลือกโดยพิจารณาความสมดุลระหว่างราคากับความสะดวกสบาย เช่น ระยะเวลาเดินทางและจำนวนครั้งที่หยุดพัก
            ในข้อมูลจำลองนี้ใช้ลำดับ “ยอดนิยม” ที่เก็บมาจากแหล่งข้อมูลต้นทาง</p>
          <p>“ถูกที่สุด” เรียงตามราคารวมจากน้อยไปมาก และราคา “เริ่มต้น” จะเปลี่ยนตามตัวกรองที่ใช้อยู่</p>
          <p className="sub">ราคาไม่ได้มีผลต่อการจัดอันดับเพราะผู้ขายจ่ายเงินให้เรา — SkyThai Pro ไม่มีโฆษณาหรือผู้สนับสนุน</p>
        </Modal>
      )}
      {modal === "login" && (
        <Modal title="ลงชื่อเข้าใช้เพื่อติดตามราคา" onClose={() => setModal(null)} testId="login-required-modal">
          <p>การติดตามราคาต้องเข้าสู่ระบบก่อน (กฎ C24) เวอร์ชันนี้ยังไม่มีระบบบัญชีผู้ใช้ จึงยังเปิดการติดตามไม่ได้ และสวิตช์จะยังปิดอยู่</p>
          <div className="popover-actions"><button type="button" className="btn-secondary" onClick={() => setModal(null)}>ตกลง</button></div>
        </Modal>
      )}
      {modal === "chart" && (
        <Modal title="กราฟราคา (ขาไป)" onClose={() => setModal(null)} testId="price-graph-modal">
          {p.insights && <PriceChart data={[...p.insights.history, ...(p.cheaper ? [{ date: p.cheaper.date, price: p.cheaper.price }] : [])].sort((a, b) => (a.date < b.date ? -1 : 1))} />}
          <p className="sub">ราคาต่ำสุดที่บันทึกไว้ตามวันที่ (ข้อมูลจำลอง ณ วันที่เก็บ) · วันที่เลือก: {fmtShort(gridPick)}</p>
          <div className="date-grid">
            {gridDays.map((d) => {
              const price = gridPrice(d);
              return (
                <button key={d} type="button" className={`date-cell ${gridPick === d ? "sel" : ""}`} disabled={!isSelectableDate(d, p.today)}
                  data-testid={`graph-${d}`} onClick={() => setGridPick(d)}>
                  <div>{fmtShort(d)}</div>
                  <div className="p">{price !== null ? baht(price) : "—"}</div>
                </button>
              );
            })}
          </div>
          <div className="popover-actions">
            <button type="button" className="btn-link" data-testid="graph-cancel" onClick={() => setModal(null)}>ยกเลิก</button>
            <button type="button" className="btn-primary" data-testid="graph-ok" onClick={() => { setModal(null); if (gridPick !== p.date) goDate(gridPick); }}>ตกลง</button>
          </div>
        </Modal>
      )}
      {modal === "grid" && (
        <Modal title="ตารางวันที่ (ขาไป)" onClose={() => setModal(null)} testId="date-grid-modal">
          <div className="date-grid">
            {gridDays.map((d) => {
              const price = gridPrice(d);
              const ok = isSelectableDate(d, p.today);
              return (
                <button key={d} type="button" className={`date-cell ${gridPick === d ? "sel" : ""}`} disabled={!ok}
                  data-testid={`grid-${d}`} onClick={() => setGridPick(d)}>
                  <div>{fmtShort(d)}</div>
                  <div className="p">{price !== null ? baht(price) : "—"}</div>
                  {price !== null && price === gridMin && <div className="best">ถูกที่สุด</div>}
                </button>
              );
            })}
          </div>
          <p className="sub">“—” = ไม่มีราคาในข้อมูลจำลอง · เลือกแล้ว: {fmtShort(gridPick)}{gridPrice(gridPick) !== null ? ` · ${baht(gridPrice(gridPick)!)}` : ""}</p>
          <div className="popover-actions">
            <button type="button" className="btn-link" data-testid="grid-cancel" onClick={() => setModal(null)}>ยกเลิก</button>
            <button type="button" className="btn-primary" data-testid="grid-ok" onClick={() => { setModal(null); if (gridPick !== p.date) goDate(gridPick); }}>ตกลง</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
