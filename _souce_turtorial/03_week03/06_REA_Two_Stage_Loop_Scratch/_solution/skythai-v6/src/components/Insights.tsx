'use client';
import { useState } from 'react';
import Modal, { CloseButton } from './Modal';
import Icon from './Icon';
import { baht } from '@/lib/format';

export type Insight = { observedAt: string; level: number; current: number; typicalLow: number; typicalHigh: number; history: { t: number; p: number }[] };

const levelOf = (d: Insight) => (d.current > d.typicalHigh ? 'สูง' : d.current < d.typicalLow ? 'ต่ำ' : 'ปกติ');

// ข้อมูลเชิงลึกด้านราคา (B52 · F2): ระดับราคา + ช่วงราคาปกติ + ประวัติราคา 60 วัน (จาก payload ผลค้นหา)
export default function Insights({ data }: { data: Insight }) {
  const [open, setOpen] = useState(false);
  const level = levelOf(data);
  return (
    <section className="insights">
      <h3 className="list-title">ข้อมูลเชิงลึกด้านราคา</h3>
      <div className="insights-card">
        <div className="insights-head">
          <h4 className="insights-title">{open ? `ขณะนี้เที่ยวบินที่คุณค้นหามีราคา${level}` : `ขณะนี้เที่ยวบินมีราคา${level}`}</h4>
          <button type="button" className="icon-btn" aria-label="ดูประวัติราคา" aria-expanded={open} onClick={() => setOpen(!open)}>
            <Icon name={open ? 'up' : 'down'} />
          </button>
        </div>
        {open && (
          <div className="insights-body">
            <p>โดยปกติแล้ว ราคาขั้นต่ำของเที่ยวบินสำหรับทริปที่คล้ายคลึงกันซึ่งเดินทางสู่โตเกียวจะอยู่ระหว่าง {baht(data.typicalLow)}–{data.typicalHigh.toLocaleString('en-US')}</p>
            <p>{baht(data.current)} อยู่ในช่วงราคา <strong>{level}</strong></p>
            <h4 className="insights-title">ประวัติราคาสำหรับการค้นหานี้</h4>
            <PriceHistory data={data} />
          </div>
        )}
      </div>
    </section>
  );
}

export function PriceHistory({ data }: { data: Insight }) {
  const max = Math.max(...data.history.map(h => h.p));
  const n = data.history.length;
  return (
    <div role="application" aria-label="กราฟประวัติราคา" className="history">
      {data.history.map((h, i) => (
        <button key={h.t} type="button" className="bar" style={{ height: `${Math.round((h.p / max) * 100)}%` }}
          aria-label={`${i === n - 1 ? 'วันนี้' : `${n - 1 - i} วันที่ผ่านมา`} - ${baht(h.p)}`} />
      ))}
    </div>
  );
}

// ติดตามราคา (B55 · C49) · ตารางวันที่/กราฟราคา (B53 B54)
export function TrackPrices({ insightLess = false }: { insightLess?: boolean }) {
  const [signin, setSignin] = useState(false);
  const [tool, setTool] = useState<null | 'grid' | 'graph'>(null);
  const [data, setData] = useState<Insight | null>(null);
  const openTool = (t: 'grid' | 'graph') => { setTool(t); fetch('/api/insights').then(r => r.json()).then(setData).catch(() => {}); };
  const sw1 = 'ติดตามราคาเที่ยวบินจาก กรุงเทพมหานคร ไป โตเกียว ออกเดินทางวันที่ 2026-11-15';
  const sw2 = 'ติดตามราคาเที่ยวบินจาก กรุงเทพมหานคร ไป โตเกียว - วันใดก็ได้';
  return (
    <section role="region" aria-label="หาราคาที่ดีที่สุด" className={`track ${insightLess ? 'track-top' : ''}`}>
      <Icon name="bell" />
      <h2 className="track-title">ติดตามราคา</h2>
      <span role="button" className="icon-btn" aria-label="ดูข้อมูลเพิ่มเติมเกี่ยวกับราคาที่ติดตาม" onClick={() => setSignin(true)}>
        <a href="#track-info" aria-label="ดูข้อมูลเพิ่มเติมเกี่ยวกับราคาที่ติดตาม" onClick={e => e.preventDefault()}>
          <Icon name="info" className="icon-sm" />
        </a>
      </span>
      <div className="track-row"><span>{sw1}</span>
        <button type="button" role="switch" aria-checked={false} aria-label={sw1} className="switch" onClick={() => setSignin(true)}><span /></button>
      </div>
      <div className="track-row"><span>{sw2}</span>
        <button type="button" role="switch" aria-checked={false} aria-label={sw2} className="switch" onClick={() => setSignin(true)}><span /></button>
      </div>
      <div className="tools">
        <button type="button" className="tool-btn" onClick={() => openTool('grid')}><Icon name="calendar" className="icon-sm" />ตารางวันที่</button>
        <button type="button" className="tool-btn" onClick={() => openTool('graph')}><Icon name="chart" className="icon-sm" />กราฟราคา</button>
      </div>
      {signin && (
        <Modal label="ลงชื่อเข้าใช้เพื่อติดตามราคา" onClose={() => setSignin(false)} className="info-dialog">
          <h2 className="dialog-title">ลงชื่อเข้าใช้เพื่อติดตามราคา</h2>
          <p>เราจะติดตามราคาเที่ยวบินและข้อมูลอื่นๆ ให้ คุณจะได้ไม่ต้องคอยติดตามด้วยตนเอง</p>
          <div className="dialog-actions">
            <button type="button" className="text-btn" onClick={() => setSignin(false)}>ปิด</button>
          </div>
        </Modal>
      )}
      {tool && (
        <Modal label="ข้อมูลเชิงลึกด้านราคา" onClose={() => setTool(null)} className="tool-dialog">
          <h2 className="dialog-title">ข้อมูลเชิงลึกด้านราคา</h2>
          <CloseButton onClose={() => setTool(null)} />
          <div role="tablist" className="tabs">
            <button type="button" role="tab" aria-selected={tool === 'grid'} className={`tab ${tool === 'grid' ? 'active' : ''}`} onClick={() => setTool('grid')}>วันที่</button>
            <button type="button" role="tab" aria-selected={tool === 'graph'} className={`tab ${tool === 'graph' ? 'active' : ''}`} onClick={() => setTool('graph')}>กราฟราคา</button>
          </div>
          {tool === 'grid' && (
            <div role="tabpanel" className="tool-panel">
              <p>อาทิตย์ 15 พ.ย. (เลือกแล้ว) · ราคาต่ำสุด {data ? baht(data.current) : ''}</p>
              <p>ไม่มีข้อมูลราคาของวันอื่นในชุดข้อมูลนี้</p>
            </div>
          )}
          {tool === 'graph' && (
            <div role="tabpanel" className="tool-panel">{data ? <PriceHistory data={data} /> : <p>กำลังดึงข้อมูลราคา</p>}</div>
          )}
        </Modal>
      )}
    </section>
  );
}
