import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Confetti } from "@/components/Confetti";
import { SmartImage } from "@/components/SmartImage";
import { currentUser } from "@/lib/auth";
import { findOrder } from "@/lib/orders";
import { formatBaht } from "@/lib/pricing";
import { PET_EMOJI, getProduct, productImage } from "@/lib/products";

export const metadata: Metadata = { title: "สั่งซื้อสำเร็จ" };

const STEPS = ["รับคำสั่งซื้อ", "แพ็คสินค้า", "จัดส่ง", "ถึงแล้ว"];

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/orders/${encodeURIComponent(id)}`);
  const order = findOrder(user.id, id);
  if (!order) notFound();

  return (
    <div className="container page order-page">
      <Confetti />
      <ol className="stepper" aria-label="ขั้นตอนการสั่งซื้อ">
        <li className="done">
          <span>✓</span> ตะกร้า
        </li>
        <li className="done">
          <span>✓</span> ที่อยู่และชำระเงิน
        </li>
        <li className="current" aria-current="step">
          <span>3</span> สำเร็จ
        </li>
      </ol>

      <section className="success-hero">
        <SmartImage
          src="/images/brand/order-success.jpg"
          alt="น้องแมวและน้องหมาดีใจที่ได้รับอาหาร"
          emoji="🎉"
          tone="teal"
          className="success-img"
          eager
        />
        <div className="success-copy">
          <span className="success-check" aria-hidden="true">
            ✓
          </span>
          <h1 data-testid="order-success">สั่งซื้อสำเร็จ!</h1>
          <p>
            ขอบคุณ {order.address.name} เลขที่คำสั่งซื้อของคุณคือ{" "}
            <strong className="order-id" data-testid="order-id">
              {order.id}
            </strong>
          </p>
          <p className="muted">
            ชำระเงินแบบ{order.payment === "cod" ? "เก็บเงินปลายทาง" : " PromptPay"} · จัดส่งแบบ
            {order.shippingMethod === "express" ? "ด่วน" : "ธรรมดา"} ไปที่ {order.address.province} {order.address.postcode}
          </p>
        </div>
      </section>

      <ol className="timeline" data-testid="order-timeline" aria-label="สถานะคำสั่งซื้อ">
        {STEPS.map((s, i) => (
          <li key={s} className={i === 0 ? "active" : ""} data-testid="timeline-step" aria-current={i === 0 ? "step" : undefined}>
            <span className="tl-dot" aria-hidden="true">
              {["🧾", "📦", "🚚", "🏠"][i]}
            </span>
            <span className="tl-label">{s}</span>
          </li>
        ))}
      </ol>

      <div className="order-grid">
        <section className="card-panel">
          <h2>รายการสินค้า</h2>
          <ul className="mini-lines">
            {order.items.map((it) => {
              const p = getProduct(it.slug);
              return (
                <li key={`${it.slug}|${it.size}`} data-testid="order-item" data-slug={it.slug}>
                  <SmartImage
                    src={productImage(it.slug)}
                    alt={`รูปสินค้า ${it.name}`}
                    emoji={p ? PET_EMOJI[p.pet] : "🐾"}
                    tone={p?.pet ?? "brand"}
                    className="mini-thumb"
                  />
                  <span>
                    {it.name}
                    <small>
                      {it.size} × {it.qty}
                    </small>
                  </span>
                  <strong>{formatBaht(it.lineTotal)}</strong>
                </li>
              );
            })}
          </ul>
        </section>
        <aside className="summary-card">
          <h2>สรุปยอด</h2>
          <dl className="summary-rows">
            <div>
              <dt>ยอดรวมสินค้า</dt>
              <dd data-testid="summary-subtotal">{formatBaht(order.subtotal)}</dd>
            </div>
            <div className={order.discount > 0 ? "is-discount" : ""}>
              <dt>ส่วนลด{order.coupon ? <span className="code-pill">{order.coupon}</span> : null}</dt>
              <dd data-testid="summary-discount">{order.discount > 0 ? formatBaht(-order.discount) : formatBaht(0)}</dd>
            </div>
            <div>
              <dt>ค่าจัดส่ง</dt>
              <dd data-testid="summary-shipping" className={order.shipping === 0 ? "free" : ""}>
                {order.shipping === 0 ? "ฟรี" : formatBaht(order.shipping)}
              </dd>
            </div>
            <div className="summary-total-row">
              <dt>ยอดชำระทั้งหมด</dt>
              <dd data-testid="summary-total">{formatBaht(order.total)}</dd>
            </div>
          </dl>
          <div className="stack">
            <Link href="/account" className="btn btn-ghost btn-block">
              ดูประวัติการสั่งซื้อ
            </Link>
            <Link href="/products" className="btn btn-primary btn-block">
              ช้อปต่อ
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
