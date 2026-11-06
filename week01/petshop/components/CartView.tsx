"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  FREE_SHIPPING_MIN,
  evaluateCoupon,
  formatBaht,
  freeShippingRemaining,
  normalizeCode,
  type PricedLine,
} from "@/lib/pricing";
import { PET_EMOJI, getProduct, productImage, withStock, type Product } from "@/lib/products";
import { SummaryRows, useCartTotals } from "./OrderSummary";
import { ProductGrid } from "./ProductCard";
import { SmartImage } from "./SmartImage";
import { useShop } from "./ShopProvider";

function CartRow({ line, index }: { line: PricedLine; index: number }) {
  const { setCartQty, removeFromCart, showToast } = useShop();
  const product = getProduct(line.slug) as Product;
  const [text, setText] = useState(String(line.qty));
  const [prevQty, setPrevQty] = useState(line.qty);
  if (prevQty !== line.qty) {
    setPrevQty(line.qty);
    setText(String(line.qty));
  }

  const commit = (n: number) => setText(String(setCartQty(line.slug, line.size, n)));

  return (
    <li
      className="cart-row"
      data-testid="cart-item"
      data-slug={line.slug}
      data-size={line.size}
      style={{ ["--i" as string]: index }}
    >
      <Link href={`/products/${line.slug}`} className="row-thumb">
        <SmartImage src={productImage(line.slug)} alt={`รูปสินค้า ${line.name}`} emoji={PET_EMOJI[line.pet]} tone={line.pet} />
      </Link>
      <div className="row-info">
        <Link href={`/products/${line.slug}`} className="row-name" data-testid="item-name">
          {line.name}
        </Link>
        <small>
          {product.nameEn} · ขนาด <strong data-testid="item-size">{line.size}</strong>
        </small>
        <small className="unit-price">ชิ้นละ {formatBaht(line.price)}</small>
      </div>
      <div className="qty small">
        <label htmlFor={`qty-${line.slug}-${line.size}`} className="sr-only">
          จำนวน {line.name} {line.size}
        </label>
        <button
          type="button"
          className="qty-btn"
          data-testid="item-minus"
          aria-label={`ลดจำนวน ${line.name}`}
          onClick={() => commit(line.qty - 1)}
        >
          −
        </button>
        <input
          id={`qty-${line.slug}-${line.size}`}
          type="number"
          inputMode="numeric"
          min={1}
          data-testid="item-qty"
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            if (v.trim() === "" || !Number.isFinite(Number(v))) {
              setText(v);
              return;
            }
            commit(Number(v));
          }}
          onBlur={() => setText(String(line.qty))}
        />
        <button
          type="button"
          className="qty-btn"
          data-testid="item-plus"
          aria-label={`เพิ่มจำนวน ${line.name}`}
          onClick={() => commit(line.qty + 1)}
        >
          +
        </button>
      </div>
      <strong className="row-price" data-testid="item-line-total">
        {formatBaht(line.lineTotal)}
      </strong>
      <button
        type="button"
        className="icon-btn remove"
        data-testid="item-remove"
        aria-label={`ลบ ${line.name} ออกจากตะกร้า`}
        onClick={() => {
          removeFromCart(line.slug, line.size);
          showToast(`ลบ ${line.name} ออกจากตะกร้าแล้ว`, "info");
        }}
      >
        ✕
      </button>
    </li>
  );
}

export function FreeShippingProgress({ subtotal }: { subtotal: number }) {
  const remaining = freeShippingRemaining(subtotal);
  const pct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_MIN) * 100));
  return (
    <div className={`ship-progress ${remaining === 0 ? "done" : ""}`}>
      <p data-testid="free-shipping-progress">
        {remaining === 0 ? "ได้ส่งฟรีแล้ว!" : `ซื้อเพิ่มอีก ${formatBaht(remaining)} เพื่อส่งฟรี`}
      </p>
      <div
        className="bar"
        role="progressbar"
        aria-label="ความคืบหน้าส่งฟรี"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <span style={{ width: `${pct}%` }} />
        <i aria-hidden="true" style={{ left: `${pct}%` }}>
          🚚
        </i>
      </div>
    </div>
  );
}

export function CartView() {
  const { ready, cart, coupon, setCoupon, stockMap, bugMode } = useShop();
  const router = useRouter();
  const { lines, totals } = useCartTotals("standard");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const recs = useMemo(() => {
    const inCart = new Set(cart.map((i) => i.slug));
    const out: Product[] = [];
    for (const item of cart) {
      for (const s of getProduct(item.slug)?.boughtWith ?? []) {
        const p = getProduct(s);
        if (p && !inCart.has(s) && !out.some((o) => o.slug === s)) out.push(withStock(p, stockMap));
      }
    }
    return out.slice(0, 4);
  }, [cart, stockMap]);

  const apply = async (e: FormEvent) => {
    e.preventDefault();
    setChecking(true);
    let result: { ok: boolean; message: string; code?: string };
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, items: cart }),
      });
      result = await res.json();
    } catch {
      result = evaluateCoupon(code, lines, bugMode);
    }
    setChecking(false);
    if (result.ok) {
      setCoupon(normalizeCode(code));
      setError(null);
      setCode("");
    } else {
      setCoupon(null);
      setError(result.message);
    }
  };

  if (!ready) {
    return (
      <div className="container page">
        <div className="skeleton-list" aria-hidden="true">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container page">
        <div className="empty-state big" data-testid="empty-cart">
          <SmartImage src="/images/brand/empty-cart.jpg" alt="ตะกร้าว่างเปล่า" emoji="🛒" tone="sun" className="empty-img" />
          <h1>ตะกร้าของคุณยังว่างอยู่</h1>
          <p>น้อง ๆ รออาหารอร่อยอยู่นะ ไปเลือกของดีกันเถอะ</p>
          <Link href="/products" className="btn btn-primary btn-lg" data-testid="continue-shopping">
            เลือกซื้อสินค้าต่อ
          </Link>
        </div>
      </div>
    );
  }

  const message = error ?? (totals.coupon ? totals.coupon.message : null);
  const messageOk = !error && !!totals.coupon?.ok;

  return (
    <div className="container page cart-page">
      <header className="page-hero slim">
        <div>
          <p className="eyebrow">🛒 ตะกร้าสินค้า</p>
          <h1>ตะกร้าของฉัน</h1>
        </div>
        <span className="hero-emoji" aria-hidden="true">
          🛒
        </span>
      </header>

      <div className="cart-grid">
        <div>
          <FreeShippingProgress subtotal={totals.subtotal} />
          <ul className="row-list">
            {lines.map((l, i) => (
              <CartRow key={`${l.slug}|${l.size}`} line={l} index={i} />
            ))}
          </ul>
          <Link href="/products" className="link-arrow">
            ← เลือกซื้อสินค้าต่อ
          </Link>
        </div>

        <aside className="summary-card">
          <h2>สรุปคำสั่งซื้อ</h2>
          <form className="coupon" onSubmit={apply}>
            <label htmlFor="coupon-input">โค้ดส่วนลด</label>
            <div className="coupon-row">
              <input
                id="coupon-input"
                data-testid="coupon-input"
                placeholder="เช่น PAW10"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="btn btn-teal btn-sm" data-testid="coupon-apply" disabled={checking}>
                ใช้โค้ด
              </button>
            </div>
            {message ? (
              <p className={`coupon-message ${messageOk ? "ok" : "err"}`} data-testid="coupon-message" role="alert">
                {message}
              </p>
            ) : null}
            {coupon ? (
              <button
                type="button"
                className="link-btn"
                data-testid="coupon-remove"
                onClick={() => {
                  setCoupon(null);
                  setError(null);
                }}
              >
                นำคูปอง {coupon} ออก
              </button>
            ) : null}
          </form>

          <SummaryRows totals={totals} />

          <button type="button" className="btn btn-primary btn-lg btn-block" data-testid="checkout-button" onClick={() => router.push("/checkout")}>
            ดำเนินการชำระเงิน →
          </button>
          <p className="fineprint">ค่าจัดส่งแบบปกติ ฿50 · ส่งฟรีเมื่อซื้อครบ ฿999</p>
        </aside>
      </div>

      {recs.length > 0 ? (
        <section className="section" data-testid="cart-recommendations">
          <div className="section-head">
            <div>
              <p className="eyebrow">🎁 ซื้อคู่กันคุ้มกว่า</p>
              <h2>มักซื้อคู่กับสินค้าในตะกร้า</h2>
            </div>
          </div>
          <ProductGrid products={recs} />
        </section>
      ) : null}
    </div>
  );
}
