"use client";
import { useState } from "react";
import { baht } from "@/lib/format";
import { fmtDayMonth } from "@/lib/dates";
import type { Insights as InsightsT } from "@/lib/types";

export function priceLevel(i: InsightsT): { text: string; tone: string } {
  if (i.lowestNow > i.typicalHigh) return { text: "สูง", tone: "var(--red-dark)" };
  if (i.lowestNow < i.typicalLow) return { text: "ต่ำ", tone: "var(--green)" };
  return { text: "ปกติ", tone: "var(--amber)" };
}

export function PriceChart({ data }: { data: { date: string; price: number }[] }) {
  if (data.length < 2) return null;
  const W = 640, H = 140, P = 28;
  const ps = data.map((d) => d.price);
  const lo = Math.min(...ps) * 0.95, hi = Math.max(...ps) * 1.05;
  const x = (i: number) => P + (i / (data.length - 1)) * (W - 2 * P);
  const y = (p: number) => H - P - ((p - lo) / (hi - lo)) * (H - 2 * P);
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.price).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="price-chart" role="img" aria-label="กราฟประวัติราคา" data-testid="price-history-chart">
      <path d={path} fill="none" stroke="#0b2a5b" strokeWidth={2} />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1].price)} r={4} fill="#e2453c" />
      <text x={P} y={H - 6} fontSize={11} fill="#637087">{fmtDayMonth(data[0].date)}</text>
      <text x={W - P} y={H - 6} fontSize={11} fill="#637087" textAnchor="end">{fmtDayMonth(data[data.length - 1].date)}</text>
      <text x={4} y={y(Math.max(...ps)) + 4} fontSize={11} fill="#637087">{baht(Math.max(...ps))}</text>
      <text x={4} y={y(Math.min(...ps)) + 4} fontSize={11} fill="#637087">{baht(Math.min(...ps))}</text>
    </svg>
  );
}

export function InsightsBox({ i }: { i: InsightsT & { reference?: number | null } }) {
  const [open, setOpen] = useState(false);
  const lv = priceLevel(i);
  const lo = Math.min(i.typicalLow, i.lowestNow) * 0.8, hi = Math.max(i.typicalHigh, i.lowestNow) * 1.1;
  const pct = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div className={`insight${open ? " open" : ""}`} data-testid="price-insights">
      <div className="insight-head">
        <span className="insight-ico" aria-hidden="true"><i /><i /><i /></span>
        <div className="insight-title"><h3>ข้อมูลเชิงลึกด้านราคา</h3>
        <h4>ขณะนี้เที่ยวบินมีราคา<span style={{ color: lv.tone }}>{lv.text}</span></h4></div>
        <button type="button" className="btn-link insight-toggle" aria-expanded={open} data-testid="price-history-toggle" onClick={() => setOpen(!open)}>
          {open ? "ซ่อนประวัติราคา" : "ดูประวัติราคา"}
        </button>
      </div>
      {open && (
        <div className="insight-body">
          <div className="sub" data-testid="typical-range">ราคาต่ำสุดตอนนี้ {baht(i.lowestNow)} · ช่วงราคาปกติสำหรับการค้นหานี้ {baht(i.typicalLow)}–{baht(i.typicalHigh)}</div>
          {i.reference ? (
            <div className="sub" data-testid="reference-price">
              ราคาอ้างอิงจากข้อมูลที่เก็บ {baht(i.reference)} ({i.reference - i.lowestNow >= 0 ? "สูงกว่า" : "ต่ำกว่า"}ราคาต่ำสุดตอนนี้ {baht(Math.abs(i.reference - i.lowestNow))}) · ค่านี้อนุมานจากข้อมูลเครือข่าย (F8)
            </div>
          ) : null}
          <div className="price-bar" aria-hidden="true">
            <div className="mark" style={{ left: pct(i.lowestNow) }}>{baht(i.lowestNow)}</div>
          </div>
          <PriceChart data={i.history} />
          <div className="sub">ประวัติราคาต่ำสุดย้อนหลัง {i.history.length} วัน (จากข้อมูลจำลอง ณ วันที่เก็บ)</div>
        </div>
      )}
    </div>
  );
}
