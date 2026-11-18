"use client";

import Link from "next/link";
import { useRef } from "react";
import { flyToCart } from "@/lib/fx";
import { formatBaht } from "@/lib/pricing";
import { PET_EMOJI, TYPE_LABEL, getProduct, lowestPrice, productImage, smallestSize, withStock, type Product } from "@/lib/products";
import { StockBadge } from "./ProductCard";
import { SmartImage } from "./SmartImage";
import { useShop } from "./ShopProvider";

function WishlistRow({ product, index }: { product: Product; index: number }) {
  const { removeFromWishlist, addToCart, showToast } = useShop();
  const moveBtn = useRef<HTMLButtonElement>(null);
  const out = product.stock === 0;

  const moveToCart = () => {
    const added = addToCart(product.slug, smallestSize(product).label, 1);
    if (added > 0) {
      flyToCart(moveBtn.current);
      removeFromWishlist(product.slug);
      showToast(`ย้าย ${product.name} ไปที่ตะกร้าแล้ว 🛒`);
    } else {
      showToast(`ไม่สามารถเพิ่ม ${product.name} ได้ สินค้าในสต็อกไม่พอ`, "error");
    }
  };

  return (
    <li className="wish-row" data-testid="wishlist-item" data-slug={product.slug} style={{ ["--i" as string]: index }}>
      <Link href={`/products/${product.slug}`} className="row-thumb">
        <SmartImage
          src={productImage(product.slug)}
          alt={`รูปสินค้า ${product.name}`}
          emoji={PET_EMOJI[product.pet]}
          tone={product.pet}
        />
      </Link>
      <div className="row-info">
        <Link href={`/products/${product.slug}`} className="row-name">
          {product.name}
        </Link>
        <small>
          {product.nameEn} · {TYPE_LABEL[product.type]}
        </small>
        <div className="row-tags">
          <StockBadge stock={product.stock} />
        </div>
      </div>
      <strong className="row-price">{formatBaht(lowestPrice(product))}</strong>
      <div className="row-actions">
        <button
          ref={moveBtn}
          type="button"
          className="btn btn-primary btn-sm"
          data-testid="move-to-cart"
          disabled={out}
          onClick={moveToCart}
        >
          {out ? "สินค้าหมด" : "ย้ายไปตะกร้า"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          data-testid="wishlist-remove"
          aria-label={`ลบ ${product.name} ออกจากรายการโปรด`}
          onClick={() => {
            removeFromWishlist(product.slug);
            showToast(`นำ ${product.name} ออกจากรายการโปรดแล้ว`, "info");
          }}
        >
          ลบ
        </button>
      </div>
    </li>
  );
}

export function WishlistView() {
  const { wishlist, stockMap, ready } = useShop();
  const items = wishlist.map((s) => getProduct(s)).filter(Boolean).map((p) => withStock(p as Product, stockMap));

  return (
    <div className="container page">
      <header className="page-hero slim">
        <div>
          <p className="eyebrow">💖 เก็บไว้ก่อน ค่อยช้อปทีหลัง</p>
          <h1>รายการโปรด</h1>
        </div>
        <span className="hero-emoji" aria-hidden="true">
          💖
        </span>
      </header>

      {!ready ? (
        <div className="skeleton-list" aria-hidden="true">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state" data-testid="empty-wishlist">
          <SmartImage src="/images/brand/empty-wishlist.jpg" alt="ยังไม่มีรายการโปรด" emoji="💖" tone="cat" className="empty-img" />
          <h2>ยังไม่มีสินค้าในรายการโปรด</h2>
          <p>กดหัวใจที่สินค้าที่ชอบ แล้วสินค้าจะมารออยู่ที่นี่</p>
          <Link href="/products" className="btn btn-primary">
            เลือกดูสินค้า
          </Link>
        </div>
      ) : (
        <ul className="row-list">
          {items.map((p, i) => (
            <WishlistRow key={p.slug} product={p} index={i} />
          ))}
        </ul>
      )}
    </div>
  );
}
