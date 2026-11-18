'use client';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from './Modal';
import Icon from './Icon';
import { CABINS, TRIPS, Pax, Query, paxTotal, queryString, TODAY } from '@/lib/search';
import { dateCalendar, dateShort, monthName } from '@/lib/format';

// ฟอร์มค้นหา (B2–B16) · mode "home" = มีปุ่มค้นหา · mode "results" = เปลี่ยนค่าแล้วค้นหาใหม่ทันที (หน้าผลค้นหา)
export default function SearchForm({ initial, mode, children }: { initial: Query; mode: 'home' | 'results'; children?: ReactNode }) {
  const router = useRouter();
  const [q, setQ] = useState<Query>(initial);
  const [open, setOpen] = useState<null | 'trip' | 'cabin' | 'pax' | 'from' | 'to' | 'date'>(null);
  useEffect(() => setQ(initial), [initial]);

  const update = (patch: Partial<Query>) => {
    const next = { ...q, ...patch };
    setQ(next);
    if (mode === 'results' && next.to && next.date) router.push(`/search?${queryString(next)}`);
  };
  const tripLabel = TRIPS.find(t => t[0] === q.trip)![1];
  const cabinLabel = CABINS.find(c => c[0] === q.cabin)![1];
  const total = paxTotal(q.pax);

  const submit = () => {
    if (!q.to) { router.push(`/explore?${queryString(q)}`); return; }
    if (!q.date) { setOpen('date'); return; }
    router.push(`/search?${queryString(q)}`);
  };

  return (
    <div role="search" aria-label={mode === 'home' ? 'เที่ยวบิน' : undefined} className={`search search-${mode}`}>
      {mode === 'results' && <h1 className="visually-compact">การค้นหาเที่ยวบิน</h1>}
      <div className="form-card">
        <div className="form-options">
          <div className="select-wrap">
            <button type="button" role="combobox" aria-expanded={open === 'trip'} aria-haspopup="listbox"
              aria-label={`เปลี่ยนประเภทตั๋ว ${tripLabel}`} className="select" onClick={() => setOpen(open === 'trip' ? null : 'trip')}>
              <span>{tripLabel}</span><Icon name="down" className="icon-sm" />
            </button>
            {open === 'trip' && (
              <ListPopup label="เลือกประเภทตั๋ว" items={TRIPS} value={q.trip} onClose={() => setOpen(null)}
                onPick={v => { setOpen(null); update({ trip: v, ret: v === 'roundtrip' ? q.ret : '' }); }} />
            )}
          </div>
          <div className="select-wrap">
            <button type="button" className="select" aria-label={`ผู้โดยสาร ${total} คน เปลี่ยนจำนวนผู้โดยสาร`} onClick={() => setOpen('pax')}>
              <Icon name="person" className="icon-sm" /><span>{total}</span><Icon name="down" className="icon-sm" />
            </button>
            {open === 'pax' && <PaxDialog value={q.pax} onClose={() => setOpen(null)} onDone={p => { setOpen(null); update({ pax: p }); }} />}
          </div>
          <div className="select-wrap">
            <button type="button" role="combobox" aria-expanded={open === 'cabin'} aria-haspopup="listbox"
              aria-label={`เปลี่ยนชั้นโดยสาร ${cabinLabel}`} className="select" onClick={() => setOpen(open === 'cabin' ? null : 'cabin')}>
              <span>{cabinLabel}</span><Icon name="down" className="icon-sm" />
            </button>
            {open === 'cabin' && (
              <ListPopup label="เลือกชั้นโดยสารที่ต้องการ" items={CABINS} value={q.cabin} onClose={() => setOpen(null)}
                onPick={v => { setOpen(null); update({ cabin: v }); }} />
            )}
          </div>
        </div>
        <div className="form-fields">
          <div className="places">
            <input role="combobox" aria-expanded={open === 'from'} aria-label="ต้นทาง" className="field" readOnly
              value={q.from} placeholder="มาจากที่ไหน" onClick={() => setOpen('from')} onKeyDown={e => e.key === 'Enter' && setOpen('from')} />
            <button type="button" className="swap" aria-label="สลับต้นทางกับปลายทาง" disabled={!q.to}
              onClick={() => update({ from: q.to, to: q.from })}><Icon name="swap" /></button>
            <input role="combobox" aria-expanded={open === 'to'} aria-label="ปลายทาง" className="field" readOnly
              value={q.to} placeholder="จะไปที่ไหน" onClick={() => setOpen('to')} onKeyDown={e => e.key === 'Enter' && setOpen('to')} />
          </div>
          <div className="dates">
            <input type="text" aria-label="ขาไป" className="field" readOnly value={q.date ? dateShort(`${q.date}T00:00`) : ''}
              placeholder="ขาไป" onClick={() => setOpen('date')} onKeyDown={e => e.key === 'Enter' && setOpen('date')} />
            {q.trip === 'roundtrip' && (
              <input type="text" aria-label="ขากลับ" className="field" readOnly value={q.ret ? dateShort(`${q.ret}T00:00`) : ''}
                placeholder="ขากลับ" onClick={() => setOpen('date')} />
            )}
          </div>
        </div>
        {mode === 'home' && (
          <button type="button" className="search-btn" onClick={submit}>{q.to ? 'ค้นหา' : 'สำรวจ'}</button>
        )}
      </div>
      {open === 'from' && <PlaceDialog kind="from" onClose={() => setOpen(null)} onPick={v => { setOpen(null); update({ from: v }); }} />}
      {open === 'to' && <PlaceDialog kind="to" onClose={() => setOpen(null)} onPick={v => { setOpen(null); update({ to: v }); }} />}
      {open === 'date' && (
        <CalendarDialog value={q.date} onClose={() => setOpen(null)}
          onDone={d => { setOpen(null); if (d !== q.date) update({ date: d }); }} />
      )}
      {children}
    </div>
  );
}

function ListPopup<T extends string>({ label, items, value, onPick, onClose }: {
  label: string; items: [T, string][]; value: T; onPick: (v: T) => void; onClose: () => void;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onClose]);
  return (
    <ul role="listbox" aria-label={label} className="menu">
      {items.map(([v, l]) => (
        <li key={v} role="option" aria-selected={v === value} tabIndex={0} className="menu-item"
          onClick={() => onPick(v)} onKeyDown={e => e.key === 'Enter' && onPick(v)}>{l}</li>
      ))}
    </ul>
  );
}

// ป๊อปอัปผู้โดยสาร · กฎ C1–C6
const PAX_ROWS: [keyof Pax, string, string, string, string?][] = [
  ['adults', 'ผู้ใหญ่', 'เพิ่มผู้ใหญ่', 'นำผู้ใหญ่ออก'],
  ['children', 'เด็ก', 'เพิ่มเด็กอายุ 2-11 ปี', 'นำเด็กอายุ 2-11 ปีออก', 'อายุ 2-11 ปี'],
  ['infSeat', 'ทารกที่โดยสาร', 'เพิ่มทารกที่โดยสารบนที่นั่ง', 'นำทารกที่โดยสารบนที่นั่งออก', 'ในที่นั่งของตนเอง'],
  ['infLap', 'ทารกที่โดยสาร', 'เพิ่มทารกที่โดยสารบนตัก', 'นำทารกที่โดยสารบนตักออก', 'บนตัก'],
];
export function paxError(p: Pax) {
  if (paxTotal(p) > 9) return 'ขออภัย เราไม่รองรับผู้โดยสารมากกว่า 9 ท่าน';
  if (p.infLap > p.adults) return 'ต้องมีผู้ใหญ่อย่างน้อย 1 คนสำหรับการเดินทางพร้อมทารกที่นั่งบนตัก 1 คน';
  if (p.infSeat + p.infLap > p.adults * 2) return 'คุณต้องมีผู้ใหญ่อย่างน้อยหนึ่งคนที่จะเดินทางไปกับทารกสองคน';
  return null;
}
export function PaxDialog({ value, onDone, onClose }: { value: Pax; onDone: (p: Pax) => void; onClose: () => void }) {
  const [p, setP] = useState<Pax>(value);
  const err = paxError(p);
  return (
    <Modal label="จำนวนผู้โดยสาร" onClose={onClose} className="popover">
      <ul className="pax-list">
        {PAX_ROWS.map(([k, title, add, remove, sub]) => (
          <li key={k} className="pax-row">
            <span className="pax-label">{title}{sub && <span className="sub"> {sub}</span>}</span>
            <button type="button" className="round-btn" aria-label={remove} disabled={k === 'adults' ? p.adults <= 1 : p[k] <= 0}
              onClick={() => setP({ ...p, [k]: p[k] - 1 })}><Icon name="minus" className="icon-sm" /></button>
            <span className="pax-count">{p[k]}</span>
            <button type="button" className="round-btn" aria-label={add} disabled={k === 'adults' && p.adults >= 9}
              onClick={() => setP({ ...p, [k]: p[k] + 1 })}><Icon name="plus" className="icon-sm" /></button>
          </li>
        ))}
      </ul>
      {err ? <div role="alert" className="alert">{err}</div> : (
        <div className="dialog-actions">
          <button type="button" className="text-btn" onClick={() => onDone(p)}>เสร็จ</button>
          <button type="button" className="text-btn" onClick={onClose}>ยกเลิก</button>
        </div>
      )}
    </Modal>
  );
}

type Place = { kind: string; name: string; label: string; sub: string; codes: string[] };
function PlaceDialog({ kind, onPick, onClose }: { kind: 'from' | 'to'; onPick: (city: string) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const [items, setItems] = useState<Place[]>([]);
  useEffect(() => {
    const ctl = new AbortController();
    fetch(`/api/places?q=${encodeURIComponent(text)}`, { signal: ctl.signal }).then(r => r.json()).then(setItems).catch(() => {});
    return () => ctl.abort();
  }, [text]);
  const city = (p: Place) => (p.kind === 'city' ? p.name : p.label);
  return (
    <Modal label={kind === 'from' ? 'ป้อนต้นทาง' : 'ป้อนปลายทาง'} onClose={onClose} className="place-dialog">
      <input role="combobox" aria-expanded={items.length > 0} data-autofocus className="field"
        aria-label={kind === 'from' ? 'มีต้นทางอื่นอีกไหม' : 'ปลายทาง'} value={text} onChange={e => setText(e.target.value)}
        placeholder={kind === 'from' ? 'มีต้นทางอื่นอีกไหม' : 'จะไปที่ไหน'} />
      <ul role="listbox" className="place-list">
        {items.map(p => (
          <li key={p.label} role="option" aria-selected={false} aria-label={p.label} tabIndex={0}
            className={`place-item ${p.kind}`} onClick={() => onPick(city(p))} onKeyDown={e => e.key === 'Enter' && onPick(city(p))}>
            <span>{p.label}</span> <span className="sub">{p.sub}</span>
          </li>
        ))}
        {text && !items.length && <li className="place-empty">ไม่พบสถานที่</li>}
      </ul>
    </Modal>
  );
}

// ปฏิทินเลือกวัน 2 เดือน (B11 B13) · วันก่อนวันนี้กดไม่ได้ · ไม่มีราคารายวันในข้อมูลจึงไม่แสดงราคา
function CalendarDialog({ value, onDone, onClose }: { value: string; onDone: (d: string) => void; onClose: () => void }) {
  const [sel, setSel] = useState(value);
  const start = sel || value || TODAY;
  const [ym, setYm] = useState<[number, number]>([+start.slice(0, 4), +start.slice(5, 7)]);
  const months: [number, number][] = [ym, ym[1] === 12 ? [ym[0] + 1, 1] : [ym[0], ym[1] + 1]];
  const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const shift = (n: number) => setYm(([y, m]) => { const t = y * 12 + (m - 1) + n; return [Math.floor(t / 12), (t % 12) + 1]; });
  return (
    <Modal label="เลือกวันที่" onClose={onClose} className="calendar">
      <div className="calendar-head">
        <input type="text" aria-label="ขาไป" className="field" readOnly value={sel ? dateShort(`${sel}T00:00`) : ''} placeholder="ขาไป" />
        <button type="button" className="text-btn" disabled={!sel} onClick={() => setSel('')}>รีเซ็ต</button>
      </div>
      <div className="calendar-body">
        <button type="button" className="icon-btn" aria-label="เดือนก่อนหน้า" disabled={`${ym[0]}-${String(ym[1]).padStart(2, '0')}` <= TODAY.slice(0, 7)} onClick={() => shift(-1)}><Icon name="left" /></button>
        {months.map(([y, m]) => {
          const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
          const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
          const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
          const rows: (number | null)[][] = [];
          for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
          return (
            <div role="grid" key={`${y}-${m}`} className="month">
              <div role="rowgroup">
                <div className="month-name">{monthName(m)}</div>
                {rows.map((r, i) => (
                  <div role="row" key={i} className="week">
                    {r.map((d, j) => (
                      <div role="gridcell" key={j} className="day-cell">
                        {d && (
                          <button type="button" className={`day ${sel === iso(y, m, d) ? 'selected' : ''}`}
                            aria-label={dateCalendar(y, m, d)} aria-pressed={sel === iso(y, m, d)}
                            disabled={iso(y, m, d) < TODAY} onClick={() => setSel(iso(y, m, d))}>{d}</button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <button type="button" className="icon-btn" aria-label="เดือนถัดไป" onClick={() => shift(1)}><Icon name="right" /></button>
      </div>
      <div className="dialog-actions">
        <button type="button" className="primary-btn" onClick={() => onDone(sel)}>เสร็จ</button>
      </div>
    </Modal>
  );
}
