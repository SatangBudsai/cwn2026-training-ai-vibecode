'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal, { CloseButton } from './Modal';
import Icon from './Icon';
import {
  Flight, baht, co2Label, co2Short, dateShort, detailsLabel, displayAirlines, duration, layoverText, legText, legroomText,
  plusDays, rowLinkName, stopsSummary, time,
} from '@/lib/format';

// แถวเที่ยวบิน (B31–B37 · B56): ลิงก์ทั้งแถว → หน้าจอง · ปุ่ม CO2e → dialog · ปุ่ม ˅ ขยายรายละเอียดในที่
export default function FlightRow({ f, cheapest, bookingHref }: { f: Flight; cheapest: boolean; bookingHref: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [co2, setCo2] = useState(false);
  const go = () => router.push(bookingHref);
  return (
    <li className={`row ${open ? 'expanded' : ''}`}>
      <a className="row-link" href={bookingHref} aria-label={rowLinkName(f)} onClick={e => { e.preventDefault(); go(); }} />
      <div className="row-main">
        <span className="row-logo" aria-hidden="true">{f.airlineCodes.split(',')[0]}</span>
        {open ? (
          <div className="row-head-expanded">เวลาออกเดินทาง · {dateShort(f.departureLocal)}</div>
        ) : (
          <div className="row-summary">
            <div className="col-times">
              <div className="row-time">{time(f.departureLocal)} – {time(f.arrivalLocal)}{plusDays(f.departureLocal, f.arrivalLocal)}</div>
              <div className="row-sub">{displayAirlines(f)}{f.operatedBy && <span>·ดำเนินการโดย {f.operatedBy}</span>}</div>
            </div>
            <div className="col-duration">
              <div>{duration(f.durationMinutes)}</div>
            </div>
            <div className="col-stops">
              <div>{f.stopCount === 0 ? 'บินตรง' : `หยุดพัก ${f.stopCount} ครั้ง`}</div>
              <div className="row-sub">{stopsSummary(f).replace(/^(บินตรง|หยุดพัก \d+ ครั้ง) ?/, '')}</div>
            </div>
          </div>
        )}
        <div className="col-co2">
          <button type="button" className="co2-btn" aria-label={co2Label(f)} onClick={() => setCo2(true)}>
            <span>{co2Short(f)}</span>
            <span className="row-sub">{Math.abs(f.co2e.comparisonPercent) <= 5 ? 'การปล่อยก๊าซโดยเฉลี่ย' : `ปริมาณการปล่อยก๊าซ ${f.co2e.comparisonPercent > 0 ? '+' : ''}${f.co2e.comparisonPercent}%`}</span>
          </button>
        </div>
        {open && <button type="button" className="select-btn" onClick={go}>เลือกเที่ยวบิน</button>}
        <div className={`col-price ${cheapest ? 'good' : ''}`}>
          <div className="price">{baht(f.price.amount)}</div>
        </div>
        <button type="button" className="expand-btn" aria-expanded={open} aria-label={detailsLabel(f)} onClick={() => setOpen(!open)}>
          <Icon name={open ? 'up' : 'down'} />
        </button>
      </div>
      {open && <FlightDetails f={f} />}
      {co2 && (
        <Modal label="ปัจจัยของผลกระทบต่อสภาพอากาศ" onClose={() => setCo2(false)} className="info-dialog">
          <h2 className="dialog-title">ปัจจัยของผลกระทบต่อสภาพอากาศ</h2>
          <CloseButton onClose={() => setCo2(false)} />
          <p>การปล่อยก๊าซ {co2Short(f)} · ค่าทั่วไปของเส้นทางนี้ {f.co2e.typicalKg} กก.</p>
          <p>ปริมาณการปล่อยก๊าซเรือนกระจกตลอดอายุการใช้งาน (ตามที่แสดงไว้เป็น CO2e) เป็นค่าที่คำนวณโดยประมาณสำหรับที่นั่งหนึ่งที่ในเที่ยวบินนี้</p>
        </Modal>
      )}
    </li>
  );
}

export function FlightDetails({ f }: { f: Flight }) {
  return (
    <div className="details">
      {f.legs.map((l, i) => {
        const t = legText(l, l.arrivalLocal.slice(0, 10) !== l.departureLocal.slice(0, 10));
        const lay = f.layovers[i];
        return (
          <div key={i} className="leg">
            <div className="leg-route">
              <div>{t.dep}</div>
              <div className="row-sub">{t.travel}</div>
              <div>{t.arr}</div>
              <div className="row-sub">{t.info}</div>
            </div>
            <ul className="leg-extras">
              {legroomText(l.legroom) && <li>{legroomText(l.legroom)}</li>}
              {l.co2eGramsRaw !== null && <li>ปริมาณการปล่อยก๊าซโดยประมาณ: CO2e {Math.round(l.co2eGramsRaw / 1000)} กก.</li>}
            </ul>
            {lay && i < f.legs.length - 1 && <div className="layover">{layoverText(lay)}</div>}
          </div>
        );
      })}
    </div>
  );
}
