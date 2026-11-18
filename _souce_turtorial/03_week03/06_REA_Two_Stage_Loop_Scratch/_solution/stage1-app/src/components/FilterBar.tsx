'use client';
import { useEffect, useState } from 'react';
import Modal, { CloseButton } from './Modal';
import Icon from './Icon';
import { Filters, PRICE_ANY, PRICE_STEP, LAYOVER_MIN, LAYOVER_MAX, activeGroups } from '@/lib/filters';
import { baht, duration } from '@/lib/format';

export type Facets = {
  airlines: string[];
  connects: { code: string; city: string; name: string }[];
  price: { min: number; max: number };
  maxDurationHours: number;
};
type Group = 'stops' | 'airlines' | 'bags' | 'price' | 'times' | 'emissions' | 'connect' | 'duration';
const TITLES: Record<Group, string> = {
  stops: 'จำนวนครั้งที่แวะพัก', airlines: 'สายการบิน', bags: 'สัมภาระ', price: 'ราคา', times: 'เวลา',
  emissions: 'การปล่อยก๊าซ', connect: 'สนามบินสำหรับต่อเครื่อง', duration: 'ระยะเวลา',
};
const ORDER: Group[] = ['stops', 'airlines', 'bags', 'price', 'times', 'emissions', 'connect', 'duration'];
const STOPS: [Filters['stops'], string, string][] = [
  ['', 'ไม่จำกัดจำนวนครั้งที่แวะพัก', ''], ['0', 'บินตรงเท่านั้น', 'บินตรง'],
  ['1', 'แวะพัก 1 ครั้งหรือน้อยกว่า', 'แวะพัก 1 ครั้งหรือน้อยกว่า'], ['2', 'แวะพัก 2 ครั้งหรือน้อยกว่า', 'แวะพัก 2 ครั้งหรือน้อยกว่า'],
];
export const EMPTY: Filters = {
  stops: '', airlines: null, bags: 0, maxPrice: null, depFrom: 0, depTo: 24, arrFrom: 0, arrTo: 24,
  lowEmissions: false, connects: null, layoverMin: null, layoverMax: null, hideSelfTransfer: false, maxDuration: null,
};
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

// ค่าที่แสดงบนชิปเมื่อใช้ตัวกรอง (C26)
function chipValue(g: Group, f: Filters, facets: Facets | null): string | null {
  switch (g) {
    case 'stops': return STOPS.find(s => s[0] === f.stops)?.[2] || null;
    case 'airlines': return f.airlines ? (f.airlines.length === 1 ? f.airlines[0] : `สายการบิน ${f.airlines.length} สาย`) : null;
    case 'bags': return f.bags ? `กระเป๋าถือขึ้นเครื่อง ${f.bags} ใบ` : null;
    case 'price': return f.maxPrice !== null ? `สูงสุด ${baht(f.maxPrice)}` : null;
    case 'times': return null;
    case 'emissions': return f.lowEmissions ? 'การปล่อยก๊าซต่ำ' : null;
    case 'connect': return f.connects ? (f.connects.length === 1 ? (facets?.connects.find(c => c.code === f.connects![0])?.city || f.connects[0]) : `สนามบิน ${f.connects.length} แห่ง`) : f.layoverMax !== null ? `แวะพักไม่เกิน ${duration(f.layoverMax)}` : f.layoverMin !== null ? `แวะพักอย่างน้อย ${duration(f.layoverMin)}` : null;
    case 'duration': return f.maxDuration !== null ? `ไม่เกิน ${f.maxDuration} ชม.` : null;
  }
}
function clearGroup(g: Group, f: Filters): Filters {
  switch (g) {
    case 'stops': return { ...f, stops: '' };
    case 'airlines': return { ...f, airlines: null };
    case 'bags': return { ...f, bags: 0 };
    case 'price': return { ...f, maxPrice: null };
    case 'times': return { ...f, depFrom: 0, depTo: 24, arrFrom: 0, arrTo: 24 };
    case 'emissions': return { ...f, lowEmissions: false };
    case 'connect': return { ...f, connects: null, layoverMin: null, layoverMax: null };
    case 'duration': return { ...f, maxDuration: null };
  }
}

export default function FilterBar({ filters, setFilters, facets }: { filters: Filters; setFilters: (f: Filters) => void; facets: Facets | null }) {
  const [open, setOpen] = useState<Group | 'all' | null>(null);
  const active = activeGroups(filters);
  const n = Object.values(active).filter(Boolean).length;
  const chips = [...ORDER.filter(g => active[g]), ...ORDER.filter(g => !active[g])];
  return (
    <div className="filters">
      <h2 className="filters-title">ตัวกรอง</h2>
      <div className="chips">
        <button type="button" className={`chip ${n ? 'selected' : ''}`} onClick={() => setOpen('all')}>
          <Icon name="filter" className="icon-sm" />{n ? `ตัวกรองทั้งหมด (${n})` : 'ตัวกรองทั้งหมด'}
        </button>
        {chips.map(g => {
          const v = chipValue(g, filters, facets);
          const on = active[g];
          const label = on ? (g === 'times' ? `${TITLES[g]}, เลือกแล้ว` : `${v}, ${TITLES[g]}, เลือกแล้ว`) : `${TITLES[g]}, ไม่ได้เลือก`;
          return (
            <span key={g} className={`chip-wrap ${on ? 'selected' : ''}`}>
              <button type="button" className={`chip ${on ? 'selected' : ''}`} aria-label={label} onClick={() => setOpen(g)}>
                {on && g !== 'times' ? v : TITLES[g]}<Icon name="down" className="icon-sm" />
              </button>
              {on && (
                <button type="button" className="chip-clear" aria-label={`ล้าง ${TITLES[g]}`} onClick={() => setFilters(clearGroup(g, filters))}>×</button>
              )}
            </span>
          );
        })}
      </div>
      {open && open !== 'all' && (
        <Modal label={TITLES[open]} onClose={() => setOpen(null)} className="popover filter-popover" modal={false}>
          <h2 className="dialog-title">{TITLES[open]}</h2>
          <CloseButton onClose={() => setOpen(null)} />
          <GroupBody g={open} f={filters} set={setFilters} facets={facets} />
          <button type="button" className="text-btn" aria-label={`ล้าง ${TITLES[open]}`} disabled={!active[open]}
            onClick={() => setFilters(clearGroup(open, filters))}>ล้าง</button>
        </Modal>
      )}
      {open === 'all' && (
        <Modal label="ตัวกรอง" onClose={() => setOpen(null)} className="all-filters">
          <h2 className="dialog-title">ตัวกรอง</h2>
          <CloseButton onClose={() => setOpen(null)} />
          {ORDER.map(g => (
            <section key={g} className="all-filters-group">
              <h3>{TITLES[g]}</h3>
              <GroupBody g={g} f={filters} set={setFilters} facets={facets} />
            </section>
          ))}
          <section className="all-filters-group">
            <h3>ตั๋วแยกและตั๋วที่มีการเปลี่ยนเครื่องด้วยตนเอง</h3>
            <div role="radiogroup" aria-label="ตั๋วแยกและตั๋วที่มีการเปลี่ยนเครื่องด้วยตนเอง" className="options">
              <label className="option-row"><input type="radio" name="self" aria-label="แสดงตั๋วแยกและตั๋วที่มีการเปลี่ยนเครื่องด้วยตนเอง" checked={!filters.hideSelfTransfer}
                onChange={() => setFilters({ ...filters, hideSelfTransfer: false })} />แสดงตั๋วแยกและตั๋วที่มีการเปลี่ยนเครื่องด้วยตนเอง</label>
              <label className="option-row"><input type="radio" name="self" aria-label="ซ่อนตั๋วแยกและตั๋วที่มีการเปลี่ยนเครื่องด้วยตนเอง" checked={filters.hideSelfTransfer}
                onChange={() => setFilters({ ...filters, hideSelfTransfer: true })} />ซ่อนตั๋วแยกและตั๋วที่มีการเปลี่ยนเครื่องด้วยตนเอง</label>
            </div>
          </section>
          <div className="dialog-actions">
            <button type="button" className="text-btn" disabled={!n} onClick={() => setFilters(EMPTY)}>ล้างทั้งหมด</button>
            <button type="button" className="primary-btn" onClick={() => setOpen(null)}>แสดงผลลัพธ์</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Slider({ label, min, max, step, value, text, onChange }: {
  label: string; min: number; max: number; step: number; value: number; text: string; onChange: (v: number) => void;
}) {
  // ปล่อยค่าเมื่อหยุดเลื่อนเพื่อไม่ให้ค้นหาทุกขั้น (คีย์บอร์ดทีละขั้นยังอัปเดต aria-valuenow ทันที)
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  useEffect(() => { if (v === value) return; const t = setTimeout(() => onChange(v), 400); return () => clearTimeout(t); }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <input type="range" className="slider" aria-label={label} min={min} max={max} step={step} value={v}
      aria-valuetext={text} onChange={e => setV(+e.target.value)} />
  );
}

function GroupBody({ g, f, set, facets }: { g: Group; f: Filters; set: (f: Filters) => void; facets: Facets | null }) {
  const [hover, setHover] = useState<string | null>(null);
  switch (g) {
    case 'stops':
      return (
        <div role="radiogroup" aria-label="จำนวนครั้งที่แวะพัก" className="options">
          {STOPS.map(([v, l]) => (
            <label key={v} className="option-row">
              <input type="radio" name="stops" aria-label={l} checked={f.stops === v} onChange={() => set({ ...f, stops: v })} />{l}
            </label>
          ))}
        </div>
      );
    case 'airlines': {
      const all = facets?.airlines || [];
      const sel = f.airlines ?? all;
      const toggle = (a: string) => {
        const next = sel.includes(a) ? sel.filter(x => x !== a) : [...sel, a];
        set({ ...f, airlines: next.length === all.length ? null : next });
      };
      return (
        <div className="options">
          <label className="option-row switch-row">เลือกสายการบินทั้งหมด
            <button type="button" role="switch" aria-checked={f.airlines === null} aria-label="เลือกสายการบินทั้งหมด"
              className="switch" onClick={() => set({ ...f, airlines: f.airlines === null ? [] : null })}><span /></button>
          </label>
          <div className="group-label">สายการบิน</div>
          <ul aria-label="สายการบิน" className="check-list">
            {all.map(a => (
              <li key={a} className="option-row" onMouseEnter={() => setHover(a)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(a)}>
                <label><input type="checkbox" aria-label={a} checked={sel.includes(a)} onChange={() => toggle(a)} />{a}</label>
                <button type="button" className={`only-btn ${hover === a ? 'shown' : ''}`} aria-label={`${a} เท่านั้น`}
                  onClick={() => set({ ...f, airlines: [a] })}>เท่านั้น</button>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case 'bags':
      return (
        <div className="options">
          <div className="option-row">กระเป๋าถือขึ้นเครื่อง
            <button type="button" className="round-btn" aria-label="นำกระเป๋าถือขึ้นเครื่องออก" disabled={f.bags <= 0} onClick={() => set({ ...f, bags: f.bags - 1 })}><Icon name="minus" className="icon-sm" /></button>
            <span className="pax-count">{f.bags}</span>
            <button type="button" className="round-btn" aria-label="เพิ่มกระเป๋าถือขึ้นเครื่อง" disabled={f.bags >= 1} onClick={() => set({ ...f, bags: f.bags + 1 })}><Icon name="plus" className="icon-sm" /></button>
          </div>
        </div>
      );
    case 'price': {
      const v = f.maxPrice ?? PRICE_ANY;
      return (
        <div className="options">
          <div>{f.maxPrice === null ? 'ทุกราคา' : `สูงสุด ${baht(f.maxPrice)}`}</div>
          <Slider label="ราคาสูงสุด" min={PRICE_STEP} max={PRICE_ANY} step={PRICE_STEP} value={v}
            text={v >= PRICE_ANY ? 'ทุกราคา' : `แสดงราคาไม่เกิน ${baht(v)}`}
            onChange={x => set({ ...f, maxPrice: x >= PRICE_ANY ? null : x })} />
        </div>
      );
    }
    case 'times': {
      const dep = f.depFrom === 0 && f.depTo === 24 ? 'ทุกเวลา' : `${hh(f.depFrom)} - ${hh(f.depTo)}`;
      const arr = f.arrFrom === 0 && f.arrTo === 24 ? 'ทุกเวลา' : `${hh(f.arrFrom)} - ${hh(f.arrTo)}`;
      return (
        <div className="options">
          <div>กรุงเทพมหานคร ไปยัง โตเกียว</div>
          <div>เวลาออกเดินทาง · {dep}</div>
          <Slider label="เวลาออกเดินทางที่เร็วที่สุด" min={0} max={23} step={1} value={f.depFrom} text={hh(f.depFrom)} onChange={x => set({ ...f, depFrom: Math.min(x, f.depTo) })} />
          <Slider label="เวลาออกเดินทางที่ช้าที่สุด" min={1} max={24} step={1} value={f.depTo} text={hh(f.depTo)} onChange={x => set({ ...f, depTo: Math.max(x, f.depFrom) })} />
          <div>เวลามาถึง · {arr}</div>
          <Slider label="เวลาถึงที่เร็วที่สุด" min={0} max={23} step={1} value={f.arrFrom} text={hh(f.arrFrom)} onChange={x => set({ ...f, arrFrom: Math.min(x, f.arrTo) })} />
          <Slider label="เวลาถึงที่ช้าที่สุด" min={1} max={24} step={1} value={f.arrTo} text={hh(f.arrTo)} onChange={x => set({ ...f, arrTo: Math.max(x, f.arrFrom) })} />
        </div>
      );
    }
    case 'emissions':
      return (
        <div role="radiogroup" aria-label="การปล่อยก๊าซ" className="options">
          <label className="option-row"><input type="radio" name="em" aria-label="การปล่อยก๊าซทุกระดับ" checked={!f.lowEmissions} onChange={() => set({ ...f, lowEmissions: false })} />การปล่อยก๊าซทุกระดับ</label>
          <label className="option-row"><input type="radio" name="em" aria-label="การปล่อยก๊าซต่ำเท่านั้น" checked={f.lowEmissions} onChange={() => set({ ...f, lowEmissions: true })} />การปล่อยก๊าซต่ำเท่านั้น</label>
        </div>
      );
    case 'connect': {
      const all = (facets?.connects || []).map(c => c.code);
      const sel = f.connects ?? all;
      const lmin = f.layoverMin ?? LAYOVER_MIN;
      const lm = f.layoverMax ?? LAYOVER_MAX;
      const toggle = (c: string) => {
        const next = sel.includes(c) ? sel.filter(x => x !== c) : [...sel, c];
        set({ ...f, connects: next.length === all.length ? null : next });
      };
      return (
        <div className="options">
          <div>ระยะเวลาแวะพัก · {f.layoverMin === null && f.layoverMax === null ? 'ทั้งหมด' : `${duration(lmin)} - ${duration(lm)}`}</div>
          <Slider label="ระยะเวลาแวะพักขั้นต่ำ" min={LAYOVER_MIN} max={LAYOVER_MAX} step={30} value={lmin} text={duration(lmin)}
            onChange={x => set({ ...f, layoverMin: x <= LAYOVER_MIN ? null : Math.min(x, lm) })} />
          <Slider label="ระยะเวลาแวะพักสูงสุด" min={LAYOVER_MIN} max={LAYOVER_MAX} step={30} value={lm} text={duration(lm)}
            onChange={x => set({ ...f, layoverMax: x >= LAYOVER_MAX ? null : Math.max(x, lmin) })} />
          <label className="option-row switch-row">สนามบินทั้งหมดสำหรับต่อเครื่อง
            <button type="button" role="switch" aria-checked={f.connects === null} aria-label="สนามบินทั้งหมดสำหรับต่อเครื่อง"
              className="switch" onClick={() => set({ ...f, connects: f.connects === null ? [] : null })}><span /></button>
          </label>
          <ul aria-label="สนามบินสำหรับต่อเครื่อง" className="check-list">
            {(facets?.connects || []).map(c => (
              <li key={c.code} className="option-row" onMouseEnter={() => setHover(c.code)} onMouseLeave={() => setHover(null)}>
                <label><input type="checkbox" aria-label={`${c.city} (${c.code})`} checked={sel.includes(c.code)} onChange={() => toggle(c.code)} />{c.city} ({c.code})</label>
                <button type="button" className={`only-btn ${hover === c.code ? 'shown' : ''}`} aria-label={`${c.city} (${c.code}) เท่านั้น`}
                  onClick={() => set({ ...f, connects: [c.code] })}>เท่านั้น</button>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case 'duration': {
      const max = facets?.maxDurationHours || 48;
      const v = f.maxDuration ?? max;
      return (
        <div className="options">
          <div>ระยะเวลาบิน · {f.maxDuration === null ? 'ไม่จำกัด' : `ไม่เกิน ${f.maxDuration} ชม.`}</div>
          <Slider label="ระยะเวลา" min={1} max={max} step={1} value={v} text={f.maxDuration === null ? 'ไม่จำกัด' : `ต่ำกว่า ${v} ชั่วโมง`}
            onChange={x => set({ ...f, maxDuration: x >= max ? null : x })} />
        </div>
      );
    }
  }
}
