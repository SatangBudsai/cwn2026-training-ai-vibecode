"use client";
import Link from "next/link";
import { memo, useState } from "react";
import { fmtDuration, fmtLong } from "@/lib/dates";
import { baht, kg } from "@/lib/format";
import type { FlightView } from "@/lib/types";
import { AirlineBadge, Modal } from "./ui";

export function stopsText(f: FlightView) {
  return f.stops === 0 ? "บินตรง" : `แวะพัก ${f.stops} ครั้ง`;
}

function co2Level(f: FlightView) {
  return f.co2.level === 2 ? "การปล่อยก๊าซโดยเฉลี่ย" : `ปริมาณการปล่อยก๊าซ ${f.co2.pct > 0 ? "+" : ""}${f.co2.pct}%`;
}

function Co2({ f, onOpen }: { f: FlightView; onOpen: () => void }) {
  const cls = f.co2.level === 1 ? "co2-low" : f.co2.level === 3 ? "co2-high" : "";
  return (
    <button type="button" className="co2-info-button" aria-haspopup="dialog"
      aria-label={`ปริมาณการปล่อยก๊าซคาร์บอนโดยประมาณ: ${Math.round(f.co2.g / 1000).toLocaleString("en-US")} กิโลกรัม. ${co2Level(f)}. ดูข้อมูลเพิ่มเติมเกี่ยวกับปริมาณการปล่อยก๊าซนี้`}
      onClick={(e) => { e.stopPropagation(); onOpen(); }}>
      <span>{kg(f.co2.g)} CO2e</span>
      <span className={`sub ${cls}`}>{f.co2.pct > 0 ? `+${f.co2.pct}%` : `${f.co2.pct}%`} การปล่อยก๊าซ</span>
    </button>
  );
}

export function FlightDetail({ f, bookHref }: { f: FlightView; bookHref?: string }) {
  return (
    <div className="flight-detail" data-testid={`flight-detail-${f.id}`}>
      {f.legs.map((l, i) => (
        <div key={l.seq}>
          <div className="leg" data-testid="leg">
            <div className="leg-line" />
            <div>
              <div><b>{l.departTime}</b> · {l.fromName} ({l.from})</div>
              <div className="sub" style={{ margin: "6px 0" }}>เวลาเดินทาง: {fmtDuration(l.durationMin)}</div>
              <div><b>{l.arriveTime}</b>{l.arriveDate !== l.departDate && <sup className="warn"> +{(new Date(l.arriveDate).getTime() - new Date(l.departDate).getTime()) / 86400000}</sup>} · {l.toName} ({l.to})</div>
            </div>
            <div className="leg-meta">
              <div>{l.carrierName} · <b>{l.flightNumber}</b></div>
              {l.operatedBy && <div>ดำเนินการโดย {l.operatedBy}</div>}
              <div>ชั้นประหยัด{l.aircraft ? ` · ${l.aircraft}` : ""}</div>
              {l.legroom && <div>พื้นที่วางขาโดยเฉลี่ย ({l.legroom})</div>}
              {l.co2g && <div>การปล่อยก๊าซโดยประมาณ {kg(l.co2g)} CO2e</div>}
            </div>
          </div>
          {f.layovers[i] && (
            <div className="layover-box" data-testid="layover">
              แวะพัก {fmtDuration(f.layovers[i].durationMin)} · {f.layovers[i].airportName} ({f.layovers[i].airport}){f.layovers[i].city ? ` · ${f.layovers[i].city}` : ""}
              {" "}{f.layovers[i].long && <span className="tag" data-testid="tag-long-layover">⚠ แวะพักนาน</span>}
              {f.layovers[i].overnight && <span className="tag" data-testid="tag-overnight">🌙 ข้ามคืน</span>}
              {f.layovers[i].changeAirportTo && <span className="tag" data-testid="tag-airport-change">⚠ เปลี่ยนสนามบิน: ถึง {f.layovers[i].airport} แล้วออกจาก {f.layovers[i].changeAirportTo} (เดินทางระหว่างสนามบินเอง)</span>}
            </div>
          )}
        </div>
      ))}
      <div className="sub">
        {f.assistance.map((a) => (
          <span key={a.code}><a href={a.url} target="_blank" rel="noopener noreferrer">ความช่วยเหลือสำหรับผู้โดยสาร ({a.name})</a> · </span>
        ))}
        {f.baggage.map((a) => (
          <span key={a.code}><a href={a.url} target="_blank" rel="noopener noreferrer">ค่าธรรมเนียมสัมภาระ ({a.name})</a> · </span>
        ))}
      </div>
      {bookHref && (
        <div className="detail-actions">
          <Link className="btn-primary" href={bookHref} data-testid={`select-flight-${f.id}`}>เลือกเที่ยวบิน</Link>
        </div>
      )}
    </div>
  );
}

export const FlightRow = memo(function FlightRow({ f, total, cheapest, expanded, onToggle, bookHref, onSelect }: {
  f: FlightView; total: number; cheapest: boolean; expanded: boolean; onToggle: (id: number) => void; bookHref: string; onSelect: (href: string) => void;
}) {
  const longLayover = f.layovers.some((l) => l.long);
  const airlineLabel = f.airlineLabel ?? f.airlines.map((a) => a.name).join(", ");
  const [co2Open, setCo2Open] = useState(false);
  return (
    <li className="flight" data-testid="flight-card" data-flight-id={f.id} data-price={total}>
      <div className="flight-row" role="link" tabIndex={0} aria-label={`เที่ยวบิน ${airlineLabel} ราคา ${baht(total)}`}
        onClick={() => onSelect(bookHref)} onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === "Enter") onSelect(bookHref); }}>
        <AirlineBadge codes={f.airlines.map((a) => a.code)} />
        <div>
          <div className="times" data-testid="flight-times">
            {f.departTime} – {f.arriveTime}
            {f.dayOffset > 0 && <sup title={`ถึง${fmtLong(f.arriveDate)}`} aria-label={`ถึง${fmtLong(f.arriveDate)}`}>+{f.dayOffset}</sup>}
          </div>
          <div className="sub" data-testid="flight-airlines">{airlineLabel}</div>
        </div>
        <div>
          <div>{fmtDuration(f.durationMin)}</div>
          <div className="sub">{f.origin}–{f.destination}</div>
        </div>
        <div className="hide-sm">
          <div data-testid="flight-stops">{stopsText(f)} {longLayover && <span className="warn" title="แวะพักนาน">⚠</span>}</div>
          <div className="sub">{f.layovers.map((l) => `${fmtDuration(l.durationMin)} ${l.airport}`).join(", ")}</div>
          {/* F10: the connection needs a change of airport (e.g. arrive KIX, depart ITM) */}
          {f.layovers.filter((l) => l.changeAirportTo).map((l) => (
            <div key={l.seq} className="sub warn" data-testid="airport-change">⚠ เปลี่ยนสนามบิน {l.airport}→{l.changeAirportTo}</div>
          ))}
        </div>
        <div className="hide-sm"><Co2 f={f} onOpen={() => setCo2Open(true)} /></div>
        <div className={`price ${cheapest ? "cheapest" : ""}`} data-testid="flight-price">{baht(total)}</div>
        <button type="button" className="icon-btn" aria-expanded={expanded} aria-label={`รายละเอียดเที่ยวบิน ${f.airlines[0]?.name ?? ""}`}
          data-testid={`expand-${f.id}`} onClick={(e) => { e.stopPropagation(); onToggle(f.id); }}>{expanded ? "˄" : "˅"}</button>
      </div>
      {expanded && <FlightDetail f={f} bookHref={bookHref} />}
      {co2Open && (
        <Modal title="ปริมาณการปล่อยก๊าซคาร์บอนโดยประมาณ" onClose={() => setCo2Open(false)} testId={`co2-info-${f.id}`}>
          <p>{f.origin}–{f.destination} · {airlineLabel}</p>
          <dl className="co2-comparison">
            <div><dt>เที่ยวบินนี้</dt><dd>{kg(f.co2.g)} CO2e</dd></div>
            <div><dt>ค่าปกติของเส้นทาง</dt><dd>{kg(f.co2.typical)} CO2e</dd></div>
          </dl>
          <p>{co2Level(f)}{f.co2.pct !== 0 ? ` เมื่อเทียบกับค่าปกติของเส้นทาง (${f.co2.pct > 0 ? "+" : ""}${f.co2.pct}%)` : " เมื่อเทียบกับค่าปกติของเส้นทาง"}</p>
          <p className="sub">ตัวเลขนี้เป็นค่าประมาณของการปล่อยก๊าซเรือนกระจก แสดงเป็นคาร์บอนไดออกไซด์เทียบเท่า (CO2e)</p>
        </Modal>
      )}
    </li>
  );
});
