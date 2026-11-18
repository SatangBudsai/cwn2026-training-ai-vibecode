"use client";

import Link from "next/link";
import { useRef } from "react";
import { flyToCart } from "@/lib/fx";
import { formatBaht } from "@/lib/pricing";
import {
  LIFE_PET_LABEL,
  PET_EMOJI,
  TYPE_LABEL,
  isFood,
  lowestPrice,
  productImage,
  smallestSize,
  type Product,
} from "@/lib/products";
import { SmartImage } from "./SmartImage";
import { useShop } from "./ShopProvider";

export function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <span className="stock-badge out" data-testid="stock-badge">
        หมด
      </span>
    );
  if (stock <= 5)
    return (
      <span className="stock-badge low" data-testid="stock-badge">
        เหลือ {stock} ชิ้น
      </span>
    );
  return null;
}

export function WishlistToggle({ slug, name, className = "" }: { slug: string; name: string; className?: string }) {
  const { isWishlisted, toggleWishlist, showToast } = useShop();
  const on = isWishlisted(slug);
  return (
    <button
      type="button"
      className={`wish-btn ${on ? "on" : ""} ${className}`}
      data-testid="wishlist-toggle"
      aria-pressed={on}
      aria-label={on ? `นำ ${name} ออกจากรายการโปรด` : `เพิ่ม ${name} ในรายการโปรด`}
      onClick={() => {
        const added = toggleWishlist(slug);
        showToast(added ? `เพิ่ม ${name} ในรายการโปรดแล้ว 💖` : `นำ ${name} ออกจากรายการโปรดแล้ว`, added ? "success" : "info");
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="heart">
        <path d="M12 21s-7.5-4.6-9.5-9.2C1.1 8.4 3.3 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.7 0 5.9 3.9 4.5 7.3C19.5 16.4 12 21 12 21z" />
      </svg>
    </button>
  );
}

/** Shared add-to-cart helper: adds, flies a dot, shows a toast. */
export function useAddToCart() {
  const { addToCart, showToast } = useShop();
  return (product: Product, size: string, qty: number, from?: Element | null) => {
    const added = addToCart(product.slug, size, qty);
    if (added > 0) {
      flyToCart(from ?? null);
      showToast(`เพิ่ม ${product.name} (${size}) ลงตะกร้าแล้ว 🛒`);
    } else {
      showToast(`ไม่สามารถเพิ่ม ${product.name} ได้ สินค้าในสต็อกไม่พอ`, "error");
    }
    return added;
  };
}

export function ProductCard({
  product,
  variant = "full",
  index = 0,
}: {
  product: Product;
  variant?: "full" | "compact";
  index?: number;
}) {
  const add = useAddToCart();
  const btnRef = useRef<HTMLButtonElement>(null);
  const out = product.stock === 0;
  const href = `/products/${product.slug}`;

  return (
    <article
      className={`product-card pet-${product.pet} ${variant} ${out ? "is-out" : ""}`}
      data-testid="product-card"
      data-slug={product.slug}
      style={{ ["--i" as string]: index }}
    >
      <div className="card-media">
        <Link href={href} className="card-media-link" tabIndex={-1} aria-hidden="true">
          <SmartImage
            src={productImage(product.slug)}
            alt={`รูปสินค้า ${product.name}`}
            emoji={PET_EMOJI[product.pet]}
            tone={product.pet}
            label={product.nameEn}
          />
        </Link>
        <div className="card-tags">
          <span className={`tag tag-${product.pet}`}>
            {PET_EMOJI[product.pet]}{" "}
            {isFood(product.type) ? LIFE_PET_LABEL[product.pet][product.lifeStage] : TYPE_LABEL[product.type]}
          </span>
          {product.grainFree ? <span className="tag tag-gf">🌾 เกรนฟรี</span> : null}
        </div>
        {variant === "full" ? <WishlistToggle slug={product.slug} name={product.name} className="card-wish" /> : null}
        <div className="card-stock">
          <StockBadge stock={product.stock} />
        </div>
      </div>
      <div className="card-body">
        <div className="card-meta">
          <span>{TYPE_LABEL[product.type]}</span>
          <span className="card-rating" aria-label={`คะแนน ${product.rating}`}>
            ★ {product.rating.toFixed(1)}
          </span>
        </div>
        <h3 className="card-title">
          <Link href={href} data-testid="product-name">
            {product.name}
          </Link>
        </h3>
        <p className="card-en">{product.nameEn}</p>
        <div className="card-foot">
          {variant === "full" ? (
            <>
              <span className="card-price">
                <small>เริ่มต้น</small>
                <strong data-testid="product-price">{formatBaht(lowestPrice(product))}</strong>
              </span>
              <button
                ref={btnRef}
                type="button"
                className="btn btn-primary btn-sm quick-add"
                data-testid="quick-add"
                disabled={out}
                onClick={() => add(product, smallestSize(product).label, 1, btnRef.current)}
              >
                {out ? "สินค้าหมด" : "ใส่ตะกร้า"}
              </button>
            </>
          ) : (
            <span className="card-price">
              <small>เริ่มต้น</small>
              <strong>{formatBaht(lowestPrice(product))}</strong>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  variant = "full",
  testId,
}: {
  products: Product[];
  variant?: "full" | "compact";
  testId?: string;
}) {
  return (
    <div className={`product-grid ${variant}`} data-testid={testId}>
      {products.map((p, i) => (
        <ProductCard key={p.slug} product={p} variant={variant} index={i} />
      ))}
    </div>
  );
}
