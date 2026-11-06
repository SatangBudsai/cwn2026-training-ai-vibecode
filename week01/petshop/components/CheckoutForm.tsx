"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { clientBugMode } from "@/lib/bugmode";
import { formatBaht, type ShippingMethod } from "@/lib/pricing";
import { PET_EMOJI, productImage } from "@/lib/products";
import { PROVINCES, validateShipping, type ShipField } from "@/lib/validation";
import { SummaryRows, useCartTotals } from "./OrderSummary";
import { SmartImage } from "./SmartImage";
import { useShop } from "./ShopProvider";

const FIELD_TESTID: Record<ShipField, string> = {
  name: "error-ship-name",
  phone: "error-ship-phone",
  address: "error-ship-address",
  postcode: "error-ship-postcode",
};

function FakeQr() {
  // Deterministic pseudo-QR pattern (no randomness).
  const cells: boolean[] = [];
  for (let i = 0; i < 21 * 21; i++) {
    const x = i % 21;
    const y = Math.floor(i / 21);
    const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    if (finder) {
      const fx = x > 13 ? x - 14 : x;
      const fy = y > 13 ? y - 14 : y;
      cells.push(fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4));
    } else {
      cells.push((x * 7 + y * 13 + x * y) % 5 < 2);
    }
  }
  return (
    <svg viewBox="0 0 21 21" className="qr-svg" role="img" aria-label="QR PromptPay ตัวอย่าง">
      {cells.map((on, i) => (on ? <rect key={i} x={i % 21} y={Math.floor(i / 21)} width="1" height="1" /> : null))}
    </svg>
  );
}

export function CheckoutForm({ userName }: { userName: string }) {
  const { ready, cart, coupon, clearCart, setCoupon, refreshStock, showToast, bugMode } = useShop();
  const router = useRouter();
  const [shipping, setShipping] = useState<ShippingMethod>("standard");
  const [payment, setPayment] = useState<"cod" | "promptpay">("cod");
  const [form, setForm] = useState({
    name: userName,
    phone: "",
    address: "",
    province: PROVINCES[0] as string,
    postcode: "",
  });
  const [errors, setErrors] = useState<Partial<Record<ShipField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);
  const { lines, totals } = useCartTotals(shipping);

  useEffect(() => {
    if (ready && cart.length === 0 && !placed) router.replace("/cart");
  }, [ready, cart.length, placed, router]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const errs = validateShipping(form, bugMode || clientBugMode());
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart, coupon, shipping, payment, address: form }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push("/login?next=/checkout");
        return;
      }
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        setServerError(data.error ?? "ไม่สามารถสั่งซื้อได้ กรุณาลองใหม่");
        setSubmitting(false);
        return;
      }
      setPlaced(true);
      router.push(`/orders/${data.id}`);
      clearCart();
      setCoupon(null);
      void refreshStock();
      showToast("ขอบคุณที่อุดหนุน 🎉 เรากำลังเตรียมจัดส่งให้น้องเลย");
    } catch {
      setServerError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่");
      setSubmitting(false);
    }
  };

  if (!ready || (cart.length === 0 && !placed)) {
    return (
      <div className="container page">
        <div className="skeleton-list" aria-hidden="true">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      </div>
    );
  }

  const err = (f: ShipField) =>
    errors[f] ? (
      <p className="field-error" data-testid={FIELD_TESTID[f]} role="alert">
        {errors[f]}
      </p>
    ) : null;

  return (
    <div className="container page checkout-page">
      <header className="checkout-head">
        <SmartImage src="/images/brand/checkout.jpg" alt="ภาพประกอบการชำระเงิน" emoji="📦" tone="sun" className="checkout-img" />
        <div>
          <p className="eyebrow">🔒 ชำระเงินอย่างปลอดภัย</p>
          <h1>ชำระเงิน</h1>
        </div>
      </header>
      <ol className="stepper" aria-label="ขั้นตอนการสั่งซื้อ">
        <li className="done">
          <span>✓</span> ตะกร้า
        </li>
        <li className="current" aria-current="step">
          <span>2</span> ที่อยู่และชำระเงิน
        </li>
        <li>
          <span>3</span> สำเร็จ
        </li>
      </ol>

      <form className="checkout-grid" onSubmit={submit} noValidate>
        <div className="checkout-main">
          <section className="card-panel">
            <h2>📦 ที่อยู่จัดส่ง</h2>
            <div className="form-grid">
              <div className="field span-2">
                <label htmlFor="ship-name">ชื่อผู้รับ</label>
                <input id="ship-name" data-testid="ship-name" value={form.name} onChange={set("name")} aria-invalid={!!errors.name} />
                {err("name")}
              </div>
              <div className="field">
                <label htmlFor="ship-phone">เบอร์โทรศัพท์</label>
                <input
                  id="ship-phone"
                  data-testid="ship-phone"
                  inputMode="numeric"
                  placeholder="0812345678"
                  value={form.phone}
                  onChange={set("phone")}
                  aria-invalid={!!errors.phone}
                />
                {err("phone")}
              </div>
              <div className="field">
                <label htmlFor="ship-postcode">รหัสไปรษณีย์</label>
                <input
                  id="ship-postcode"
                  data-testid="ship-postcode"
                  inputMode="numeric"
                  placeholder="10110"
                  value={form.postcode}
                  onChange={set("postcode")}
                  aria-invalid={!!errors.postcode}
                />
                {err("postcode")}
              </div>
              <div className="field span-2">
                <label htmlFor="ship-address">ที่อยู่</label>
                <textarea
                  id="ship-address"
                  data-testid="ship-address"
                  rows={3}
                  placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ"
                  value={form.address}
                  onChange={set("address")}
                  aria-invalid={!!errors.address}
                />
                {err("address")}
              </div>
              <div className="field span-2">
                <label htmlFor="ship-province">จังหวัด</label>
                <select id="ship-province" data-testid="ship-province" value={form.province} onChange={set("province")}>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="card-panel">
            <h2>🚚 วิธีจัดส่ง</h2>
            <div className="radio-cards">
              <label className={`radio-card ${shipping === "standard" ? "active" : ""}`} htmlFor="shipping-standard">
                <input
                  type="radio"
                  id="shipping-standard"
                  name="shipping"
                  value="standard"
                  data-testid="shipping-standard"
                  checked={shipping === "standard"}
                  onChange={() => setShipping("standard")}
                />
                <span className="rc-title">ส่งธรรมดา (2–3 วัน)</span>
                <span className="rc-sub">{totals.subtotal >= 999 ? "ฟรี" : "฿50"} · ส่งฟรีเมื่อซื้อครบ ฿999</span>
              </label>
              <label className={`radio-card ${shipping === "express" ? "active" : ""}`} htmlFor="shipping-express">
                <input
                  type="radio"
                  id="shipping-express"
                  name="shipping"
                  value="express"
                  data-testid="shipping-express"
                  checked={shipping === "express"}
                  onChange={() => setShipping("express")}
                />
                <span className="rc-title">ส่งด่วน (ภายใน 24 ชม.)</span>
                <span className="rc-sub">฿120</span>
              </label>
            </div>
          </section>

          <section className="card-panel">
            <h2>💳 วิธีชำระเงิน</h2>
            <div className="radio-cards">
              <label className={`radio-card ${payment === "cod" ? "active" : ""}`} htmlFor="pay-cod">
                <input
                  type="radio"
                  id="pay-cod"
                  name="payment"
                  value="cod"
                  data-testid="pay-cod"
                  checked={payment === "cod"}
                  onChange={() => setPayment("cod")}
                />
                <span className="rc-title">เก็บเงินปลายทาง</span>
                <span className="rc-sub">ชำระเมื่อได้รับสินค้า</span>
              </label>
              <label className={`radio-card ${payment === "promptpay" ? "active" : ""}`} htmlFor="pay-promptpay">
                <input
                  type="radio"
                  id="pay-promptpay"
                  name="payment"
                  value="promptpay"
                  data-testid="pay-promptpay"
                  checked={payment === "promptpay"}
                  onChange={() => setPayment("promptpay")}
                />
                <span className="rc-title">PromptPay</span>
                <span className="rc-sub">สแกน QR ชำระทันที</span>
              </label>
            </div>
            {payment === "promptpay" ? (
              <div className="promptpay-qr" data-testid="promptpay-qr">
                <FakeQr />
                <div>
                  <strong>สแกนเพื่อชำระ {formatBaht(totals.total)}</strong>
                  <p>QR นี้เป็นตัวอย่างสำหรับการทดสอบเท่านั้น ไม่มีการตัดเงินจริง</p>
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="summary-card">
          <h2>สรุปคำสั่งซื้อ</h2>
          <ul className="mini-lines">
            {lines.map((l) => (
              <li key={`${l.slug}|${l.size}`}>
                <SmartImage src={productImage(l.slug)} alt={`รูปสินค้า ${l.name}`} emoji={PET_EMOJI[l.pet]} tone={l.pet} className="mini-thumb" />
                <span>
                  {l.name}
                  <small>
                    {l.size} × {l.qty}
                  </small>
                </span>
                <strong>{formatBaht(l.lineTotal)}</strong>
              </li>
            ))}
          </ul>
          <SummaryRows totals={totals} />
          {serverError ? (
            <p className="form-error" data-testid="order-error" role="alert">
              {serverError}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary btn-lg btn-block" data-testid="place-order" disabled={submitting}>
            {submitting ? "กำลังสั่งซื้อ…" : `ยืนยันสั่งซื้อ ${formatBaht(totals.total)}`}
          </button>
        </aside>
      </form>
    </div>
  );
}
