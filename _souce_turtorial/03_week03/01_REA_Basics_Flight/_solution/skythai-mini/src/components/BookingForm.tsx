"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BookingForm({ flightId, priceText }: { flightId: number; priceText: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function review(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("กรุณากรอกชื่อ-นามสกุล");
    if (!EMAIL_RE.test(email.trim())) return setError("รูปแบบอีเมลไม่ถูกต้อง");
    setError("");
    setStep("confirm");
  }

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flightId, name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "จองไม่สำเร็จ");
      router.push(`/booking/${data.bookingCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "จองไม่สำเร็จ");
      setBusy(false);
    }
  }

  if (step === "confirm") {
    return (
      <section className="panel" data-testid="confirm-step">
        <h2>ตรวจสอบก่อนยืนยัน</h2>
        <dl className="kv">
          <dt>ชื่อผู้โดยสาร</dt><dd data-testid="confirm-name">{name.trim()}</dd>
          <dt>อีเมล</dt><dd data-testid="confirm-email">{email.trim()}</dd>
          <dt>ยอดรวม</dt><dd data-testid="confirm-total">{priceText}</dd>
        </dl>
        <p className="muted">นี่คือระบบเดโม ไม่มีการตัดเงินจริง</p>
        {error && <p className="error" role="alert" data-testid="form-error">{error}</p>}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={() => setStep("form")} disabled={busy}
            data-testid="edit-booking">แก้ไข</button>
          <button type="button" className="btn" onClick={confirm} disabled={busy} data-testid="confirm-booking">
            {busy ? "กำลังจอง..." : "ยืนยันการจอง"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <form className="panel" onSubmit={review} data-testid="booking-form" noValidate>
      <h2>ข้อมูลผู้โดยสาร (ผู้ใหญ่ 1 คน)</h2>
      <label>
        ชื่อ-นามสกุล (ตามหนังสือเดินทาง)
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Somchai Jaidee"
          autoComplete="name" maxLength={100} required data-testid="input-name" />
      </label>
      <label>
        อีเมล
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
          autoComplete="email" maxLength={200} required data-testid="input-email" />
      </label>
      {error && <p className="error" role="alert" data-testid="form-error">{error}</p>}
      <div className="actions">
        <button type="submit" className="btn" data-testid="review-booking">ถัดไป: ตรวจสอบข้อมูล</button>
      </div>
    </form>
  );
}
