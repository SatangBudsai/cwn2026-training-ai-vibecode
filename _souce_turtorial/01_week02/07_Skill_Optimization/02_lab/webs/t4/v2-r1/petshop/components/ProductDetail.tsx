"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { flyToCart } from "@/lib/fx";
import { formatBaht } from "@/lib/pricing";
import {
  LIFE_PET_LABEL,
  PET_EMOJI,
  PET_LABEL,
  PROTEIN_LABEL,
  TYPE_LABEL,
  isFood,
  productImage,
  smallestSize,
  type Product,
} from "@/lib/products";
import { ProductGrid, StockBadge, WishlistToggle, useAddToCart } from "./ProductCard";
import { SmartImage } from "./SmartImage";
import { useShop } from "./ShopProvider";

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="stars" aria-hidden="true">
      {"★★★★★".slice(0, full)}
      <span className="stars-off">{"★★★★★".slice(full)}</span>
    </span>
  );
}

function stockText(stock: number) {
  if (stock === 0) return "สินค้าหมด";
  if (stock <= 5) return `เหลือ ${stock} ชิ้น`;
  return `มีสินค้า ${stock} ชิ้น`;
}

export function ProductDetail({
  product,
  boughtWith,
  similar,
}: {
  product: Product;
  boughtWith: Product[];
  similar: Product[];
}) {
  const { ready, addRecent, addToCart, showToast } = useShop();
  const add = useAddToCart();
  const [size, setSize] = useState(product.sizes[0].label);
  const [qtyText, setQtyText] = useState("1");
  const addBtn = useRef<HTMLButtonElement>(null);
  const bundleBtn = useRef<HTMLButtonElement>(null);
  const stock = product.stock;
  const out = stock === 0;
  const food = isFood(product.type);
  const price = product.sizes.find((s) => s.label === size)?.price ?? product.sizes[0].price;

  useEffect(() => {
    if (ready) addRecent(product.slug);
  }, [ready, product.slug, addRecent]);

  const clamp = (n: number) => Math.min(Math.max(1, Math.floor(n) || 1), Math.max(1, stock));
  const qty = clamp(Number(qtyText));

  const onQtyChange = (v: string) => {
    if (v.trim() === "") {
      setQtyText("");
      return;
    }
    setQtyText(String(clamp(Number(v))));
  };

  const bundle = [product, ...boughtWith];
  const bundleAvailable = bundle.filter((p) => p.stock > 0);
  const bundlePrice = bundleAvailable.reduce((s, p) => s + smallestSize(p).price, 0);

  const addBundle = () => {
    let count = 0;
    for (const p of bundleAvailable) count += addToCart(p.slug, smallestSize(p).label, 1) > 0 ? 1 : 0;
    if (count > 0) {
      flyToCart(bundleBtn.current);
      showToast(`เพิ่มชุดสินค้า ${count} รายการลงตะกร้าแล้ว 🎁`);
    } else {
      showToast("ไม่สามารถเพิ่มชุดสินค้าได้ สินค้าในสต็อกไม่พอ", "error");
    }
  };

  return (
    <div className={`container page product-page pet-${product.pet}`}>
      <nav className="breadcrumb" aria-label="breadcrumb">
        <Link href="/">หน้าแรก</Link>
        <span aria-hidden="true">›</span>
        <Link href={food ? `/products?pet=${product.pet}` : `/products?pet=${product.pet}&type=${product.type}`}>
          {food ? `อาหาร${PET_LABEL[product.pet]}` : `${TYPE_LABEL[product.type]}${PET_LABEL[product.pet]}`}
        </Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="pd-grid">
        <div className="pd-gallery">
          <div className="pd-image-wrap">
            <SmartImage
              src={productImage(product.slug)}
              alt={`รูปสินค้า ${product.name}`}
              emoji={PET_EMOJI[product.pet]}
              tone={product.pet}
              testId="product-image"
              className="pd-image"
              label={product.nameEn}
              eager
            />
            <div className="pd-badges">
              <span className={`tag tag-${product.pet}`}>
                {PET_EMOJI[product.pet]}{" "}
                {food ? LIFE_PET_LABEL[product.pet][product.lifeStage] : TYPE_LABEL[product.type]}
              </span>
              {food && product.grainFree ? <span className="tag tag-gf">🌾 เกรนฟรี</span> : null}
              <StockBadge stock={stock} />
            </div>
          </div>
          <ul className="pd-facts">
            <li>
              <small>ประเภท</small>
              <strong>{TYPE_LABEL[product.type]}</strong>
            </li>
            {food && product.protein ? (
              <li>
                <small>โปรตีนหลัก</small>
                <strong>{PROTEIN_LABEL[product.protein]}</strong>
              </li>
            ) : (
              <li>
                <small>เหมาะกับ</small>
                <strong>น้อง{PET_LABEL[product.pet]}</strong>
              </li>
            )}
            <li>
              {food ? (
                <>
                  <small>ช่วงวัย</small>
                  <strong>{LIFE_PET_LABEL[product.pet][product.lifeStage]}</strong>
                </>
              ) : (
                <>
                  <small>สูตรเกรนฟรี</small>
                  <strong>—</strong>
                </>
              )}
            </li>
          </ul>
        </div>

        <div className="pd-info">
          <p className="eyebrow">
            {PET_EMOJI[product.pet]} {product.nameEn}
          </p>
          <h1 className="pd-title" data-testid="product-title">
            {product.name}
          </h1>
          <p className="pd-rating" data-testid="rating">
            <Stars value={product.rating} /> <strong>{product.rating.toFixed(1)}</strong>
            <span className="muted"> ({product.reviewCount} รีวิว)</span>
          </p>
          <p className="pd-desc">{product.description}</p>

          <div className="pd-price-row">
            <span className="pd-price" data-testid="product-price">
              {formatBaht(price)}
            </span>
            <span className="pd-size-note">/ {size}</span>
          </div>

          <fieldset className="pd-sizes">
            <legend>เลือกขนาด</legend>
            <div className="size-list">
              {product.sizes.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className={`size-option ${size === s.label ? "active" : ""}`}
                  data-testid="size-option"
                  data-size={s.label}
                  aria-pressed={size === s.label}
                  onClick={() => setSize(s.label)}
                >
                  <span>{s.label}</span>
                  <small>{formatBaht(s.price)}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="pd-buy">
            <div className="qty">
              <label htmlFor="qty-input" className="sr-only">
                จำนวน
              </label>
              <button
                type="button"
                className="qty-btn"
                data-testid="qty-minus"
                aria-label="ลดจำนวน"
                disabled={out}
                onClick={() => setQtyText(String(clamp(qty - 1)))}
              >
                −
              </button>
              <input
                id="qty-input"
                type="number"
                inputMode="numeric"
                min={1}
                max={Math.max(1, stock)}
                data-testid="qty-input"
                value={qtyText}
                disabled={out}
                onChange={(e) => onQtyChange(e.target.value)}
                onBlur={() => setQtyText(String(qty))}
              />
              <button
                type="button"
                className="qty-btn"
                data-testid="qty-plus"
                aria-label="เพิ่มจำนวน"
                disabled={out}
                onClick={() => setQtyText(String(clamp(qty + 1)))}
              >
                +
              </button>
            </div>
            <button
              ref={addBtn}
              type="button"
              className="btn btn-primary btn-lg add-to-cart"
              data-testid="add-to-cart"
              disabled={out}
              onClick={() => add(product, size, qty, addBtn.current)}
            >
              {out ? "สินค้าหมด" : "🛒 เพิ่มลงตะกร้า"}
            </button>
            <WishlistToggle slug={product.slug} name={product.name} className="pd-wish" />
          </div>

          <p className={`stock-info ${out ? "out" : stock <= 5 ? "low" : "ok"}`} data-testid="stock-info">
            <span className="dot" aria-hidden="true" /> {stockText(stock)}
          </p>

          <ul className="perks">
            <li>🚚 ส่งฟรีเมื่อซื้อครบ ฿999</li>
            <li>⚡ ส่งด่วน ฿120 ถึงไวใน 24 ชม.</li>
            <li>🏷️ ใช้โค้ด PAW10 ลด 10%</li>
          </ul>
        </div>
      </div>

      <section className="section reviews" aria-labelledby="reviews-h">
        <div className="section-head">
          <h2 id="reviews-h">รีวิวจากผู้ซื้อ</h2>
          <p className="section-sub">
            <Stars value={product.rating} /> {product.rating.toFixed(1)} จาก 5 · {product.reviewCount} รีวิว
          </p>
        </div>
        <ul className="review-list">
          {product.reviews.map((r, i) => (
            <li key={i} className="review" data-testid="review">
              <div className="review-head">
                <SmartImage
                  src={`/images/brand/avatar-${(i % 6) + 1}.jpg`}
                  alt={`รูปโปรไฟล์ ${r.name}`}
                  emoji={r.name.replace("คุณ", "").charAt(0)}
                  tone={i % 2 === 0 ? "cat" : "dog"}
                  className="review-avatar"
                />
                <div>
                  <strong>{r.name}</strong>
                  <small>{r.date}</small>
                </div>
                <span className="review-stars" aria-label={`${r.stars} ดาว`}>
                  {"★".repeat(r.stars)}
                  <span className="stars-off">{"★".repeat(5 - r.stars)}</span>
                </span>
              </div>
              <p>{r.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {boughtWith.length > 0 ? (
        <section className="section bought-together" data-testid="bought-together">
          <div className="section-head">
            <div>
              <p className="eyebrow">🎁 ซื้อคู่กันคุ้มกว่า</p>
              <h2>มักซื้อคู่กัน</h2>
            </div>
          </div>
          <div className="bundle">
            <ProductGrid products={boughtWith} variant="compact" />
            <div className="bundle-box">
              <p>ซื้อชุดนี้ ({bundleAvailable.length} รายการ, ขนาดเล็กสุด)</p>
              <strong className="bundle-price">{formatBaht(bundlePrice)}</strong>
              <button
                ref={bundleBtn}
                type="button"
                className="btn btn-teal"
                data-testid="add-bundle"
                disabled={bundleAvailable.length === 0}
                onClick={addBundle}
              >
                เพิ่มทั้งชุดลงตะกร้า
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section" data-testid="similar-products">
        <div className="section-head">
          <div>
            <p className="eyebrow">🔁 ใกล้เคียงกัน</p>
            <h2>สินค้าที่คล้ายกัน</h2>
          </div>
        </div>
        {similar.length > 0 ? (
          <ProductGrid products={similar} variant="compact" />
        ) : (
          <p className="muted">ยังไม่มีสินค้าที่คล้ายกันในหมวดนี้</p>
        )}
      </section>
    </div>
  );
}
