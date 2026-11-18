"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fmtDuration, fmtLong } from "@/lib/dates";
import { baht } from "@/lib/format";
import { cabinLabel, paxLabel, seatedPax, type Pax } from "@/lib/passengers";
import { totalFor } from "@/lib/pricing";
import { searchQuery, type SearchState } from "@/lib/search";
import type { BookingInsights, BookingOption, FlightView } from "@/lib/types";
import { FlightDetail, stopsText } from "./FlightRow";
import { PassengerPicker } from "./PassengerPicker";
import { AirlineBadge, Modal, Switch } from "./ui";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const n = (v: number) => v.toLocaleString("en-US");

export function BookingFlow({ flight: f, search, today, options, insights }: {
  flight: FlightView; search: SearchState; today: string; options: BookingOption[]; insights: BookingInsights | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [modal, setModal] = useState<null | "login" | "share">(null);
  const [copied, setCopied] = useState(false);
  // F9: sellers captured for this itinerary; without captured sellers the mock offers a single option at the result price
  const sellers: BookingOption[] = options.length ? options
    : [{ sellerCode: "SKYTHAI", sellerName: "SkyThai Pro", isAirline: false, price: f.price, extraFee: null, domain: null }];
  const [seller, setSeller] = useState(0);
  const chosen = sellers[seller] ?? sellers[0];

  const total = totalFor(chosen.price, search.pax);
  const nameErr = name.trim().length < 2 ? "กรุณากรอกชื่อ-นามสกุล (อย่างน้อย 2 ตัวอักษร)" : null;
  const emailErr = !EMAIL_RE.test(email.trim()) ? "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com" : null;

  const changePax = (pax: Pax) => router.replace(`/booking/${f.id}?${searchQuery({ ...search, pax })}`);

  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); } catch { setCopied(false); }
    setModal("share");
  };

  const confirm = async () => {
    setBusy(true);
    setServerErr(null);
    try {
      const r = await fetch("/api/bookings", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ flightId: f.id, date: search.date, pax: search.pax, cabin: search.cabin, trip: search.trip, name, email, seller: options.length ? seller : null }),
      });
      const j = await r.json();
      if (!r.ok) {
        setServerErr(j.errors ? Object.values(j.errors).join(" / ") : j.error ?? "จองไม่สำเร็จ");
        setBusy(false);
        return;
      }
      router.push(`/booking/confirmation/${j.ref}`);
    } catch {
      setServerErr("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่");
      setBusy(false);
    }
  };

  return (
    <div data-testid="booking-page">
      <div className="steps" aria-label="ขั้นตอนการจอง">
        <span className={`step ${step === 1 ? "on" : ""}`}>1. สรุปเที่ยวบิน</span>
        <span className={`step ${step === 2 ? "on" : ""}`}>2. ข้อมูลผู้ติดต่อ</span>
        <span className={`step ${step === 3 ? "on" : ""}`}>3. ยืนยันการจอง</span>
      </div>
      <div className="two-col">
        <div>
          <div className="card" data-testid="itinerary">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>เที่ยวบินขาไป · {fmtLong(f.departDate)}</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button type="button" className="btn-link" data-testid="share-button" onClick={share}>🔗 แชร์</button>
                {step === 1 && <PassengerPicker value={search.pax} onChange={changePax} align="right" />}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
              <AirlineBadge codes={f.airlines.map((a) => a.code)} />
              <div style={{ flex: 1 }}>
                <div className="times">{f.departTime} – {f.arriveTime}{f.dayOffset > 0 && <sup>+{f.dayOffset}</sup>}</div>
                <div className="sub">{f.airlines.map((a) => a.name).join(", ")} · {f.legs.map((l) => l.flightNumber).join(", ")}</div>
              </div>
              <div>
                <div>{fmtDuration(f.durationMin)}</div>
                <div className="sub">{f.origin}–{f.destination} · {stopsText(f)}</div>
              </div>
              <button type="button" className="icon-btn" aria-expanded={expanded} data-testid="booking-expand" onClick={() => setExpanded(!expanded)}>{expanded ? "˄" : "˅"}</button>
            </div>
            {expanded && <FlightDetail f={f} />}
            {options.length > 0 && (
              <div className="bag-summary" data-testid="bag-summary" style={{ marginTop: 10 }}>
                <div>🧳 กระเป๋านำขึ้นเครื่องฟรี 1 ใบ</div>
                <div>💼 สัมภาระที่โหลดใต้ท้องเครื่องใบแรกมีค่าธรรมเนียม</div>
                <div className="sub">ตามที่หน้าตัวเลือกการจองแสดงไว้ตอนเก็บข้อมูล โปรดตรวจสอบกับผู้ขายอีกครั้ง</div>
              </div>
            )}
            <div className="sub" style={{ marginTop: 10 }}>
              {f.baggage.length > 0
                ? f.baggage.map((b) => <a key={b.code} href={b.url} target="_blank" rel="noopener noreferrer" data-testid="baggage-policy">นโยบายสัมภาระของ {b.name} ↗ </a>)
                : "ข้อมูลจำลองไม่มีลิงก์นโยบายสัมภาระของสายการบินนี้ · อาจมีค่าธรรมเนียมสัมภาระโหลดใต้ท้องเครื่อง"}
            </div>
            <div className="switch-row" style={{ marginTop: 8 }}>
              <span>🔔 ติดตามราคาเที่ยวบินนี้</span>
              <Switch on={false} label="ติดตามราคา" testId="booking-track" onToggle={() => setModal("login")} />
            </div>
          </div>

          {step === 1 && (
            <div className="card" data-testid="booking-options">
              <h3>ตัวเลือกการจอง</h3>
              {sellers.map((o, i) => (
                <div className="seller" key={o.sellerCode} data-testid={`seller-${i}`}>
                  <div>
                    <b>จองกับ{o.sellerName}</b>{" "}
                    {o.isAirline ? <span className="tag">สายการบิน</span> : <span className="tag">ข้อมูลจำลอง</span>}
                    {o.extraFee ? <div className="sub" data-testid="extra-fee">รวมค่าธรรมเนียมเพิ่มเติม {n(o.extraFee)} บาท</div> : null}
                    <div className="sub">
                      {o.domain ? `ผู้ขาย: ${o.domain.replace("/...", "")} · ` : ""}ในเว็บนี้ปุ่มจะพาไปกรอกข้อมูลจองจำลอง ไม่ส่งต่อไปยังผู้ขายจริงและไม่มีการชำระเงิน
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="price" data-testid="option-price">{baht(totalFor(o.price, search.pax))}</div>
                    <button type="button" className="btn-primary" data-testid={`continue-button-${i}`} onClick={() => { setSeller(i); setStep(2); }}>ดำเนินการต่อ</button>
                  </div>
                </div>
              ))}
              {insights && (
                <p className="sub" data-testid="booking-typical">
                  ช่วงราคาปกติของเที่ยวบินนี้ {n(insights.typicalLow)}–{n(insights.typicalHigh)} บาท (คิดจากเที่ยวบินที่เลือก ไม่ใช่ทุกเที่ยวบิน · F7)
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <form className="card" data-testid="contact-form" noValidate
              onSubmit={(e) => { e.preventDefault(); setTouched(true); if (!nameErr && !emailErr) setStep(3); }}>
              <h3>ข้อมูลผู้ติดต่อ</h3>
              <div className="form-row">
                <label htmlFor="name">ชื่อ-นามสกุล (ตามหนังสือเดินทาง)</label>
                <input id="name" className="text-input" data-testid="input-name" value={name} autoComplete="name"
                  onChange={(e) => setName(e.target.value)} placeholder="เช่น Somchai Jaidee" maxLength={100} />
                {touched && nameErr && <span className="field-error" data-testid="error-name">{nameErr}</span>}
              </div>
              <div className="form-row">
                <label htmlFor="email">อีเมล</label>
                <input id="email" type="email" className="text-input" data-testid="input-email" value={email} autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" maxLength={200} />
                {touched && emailErr && <span className="field-error" data-testid="error-email">{emailErr}</span>}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button type="button" className="btn-link" onClick={() => setStep(1)}>← ย้อนกลับ</button>
                <button type="submit" className="btn-primary" data-testid="to-confirm-button">ตรวจสอบการจอง</button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="card" data-testid="confirm-step">
              <h3>ตรวจสอบและยืนยัน</h3>
              <div className="summary-line"><span>ผู้ติดต่อ</span><b data-testid="confirm-name">{name.trim()}</b></div>
              <div className="summary-line"><span>อีเมล</span><b data-testid="confirm-email">{email.trim()}</b></div>
              <div className="summary-line"><span>ผู้โดยสาร</span><span>{paxLabel(search.pax)}</span></div>
              <label style={{ display: "flex", gap: 8, margin: "14px 0" }}>
                <input type="checkbox" checked={agree} data-testid="agree-checkbox" onChange={(e) => setAgree(e.target.checked)} />
                ฉันเข้าใจว่านี่เป็นการจองจากข้อมูลจำลอง ไม่มีการชำระเงินและไม่มีการออกตั๋วจริง
              </label>
              {serverErr && <div className="notice notice-error" data-testid="booking-error">{serverErr}</div>}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button type="button" className="btn-link" onClick={() => setStep(2)} disabled={busy}>← แก้ไขข้อมูล</button>
                <button type="button" className="btn-primary" data-testid="confirm-booking-button" disabled={!agree || busy} onClick={confirm}>
                  {busy ? "กำลังบันทึก…" : "ยืนยันการจอง"}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="card" data-testid="price-summary">
          <h3>สรุปราคา</h3>
          <div className="summary-line"><span>ผู้ขาย</span><span>{chosen.sellerName}</span></div>
          <div className="summary-line"><span>ค่าโดยสารต่อที่นั่ง</span><span>{baht(chosen.price)}</span></div>
          <div className="summary-line"><span>จำนวนที่นั่ง</span><span>× {seatedPax(search.pax)}</span></div>
          {search.pax.infantsLap > 0 && <div className="summary-line"><span>ทารกบนตัก {search.pax.infantsLap}</span><span>ไม่คิดในข้อมูลจำลอง</span></div>}
          <div className="summary-line total"><span>รวม</span><span data-testid="total-price">{baht(total)}</span></div>
          <p className="sub">ราคารวมภาษีและค่าธรรมเนียม อาจมีค่าสัมภาระเพิ่มเติม · {cabinLabel(search.cabin)} · เที่ยวเดียว</p>
          <p className="sub">วันนี้ {fmtLong(today)}</p>
        </aside>
      </div>

      {modal === "login" && (
        <Modal title="ลงชื่อเข้าใช้เพื่อติดตามราคา" onClose={() => setModal(null)} testId="login-required-modal">
          <p>การติดตามราคาต้องเข้าสู่ระบบ (กฎ C24) เวอร์ชันนี้ยังไม่มีระบบบัญชีผู้ใช้</p>
        </Modal>
      )}
      {modal === "share" && (
        <Modal title="แชร์เที่ยวบินนี้" onClose={() => setModal(null)} testId="share-modal">
          <p>{copied ? "คัดลอกลิงก์แล้ว" : "คัดลอกลิงก์ด้านล่างเพื่อแชร์"}</p>
          <input className="text-input" readOnly value={typeof window !== "undefined" ? window.location.href : ""} onFocus={(e) => e.target.select()} />
        </Modal>
      )}
    </div>
  );
}
