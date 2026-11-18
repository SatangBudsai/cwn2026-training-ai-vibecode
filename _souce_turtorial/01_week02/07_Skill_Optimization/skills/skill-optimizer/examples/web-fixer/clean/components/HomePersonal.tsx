"use client";

import { useMemo } from "react";
import { PRODUCTS, byPopularity, getProduct, withStock, type Product } from "@/lib/products";
import { ProductGrid } from "./ProductCard";
import { useShop } from "./ShopProvider";

/**
 * Personalised recommendations: if pp-recent or wishlist is non-empty, recommend in-stock products
 * with the same pet and the same protein or type as those, excluding already-viewed ones.
 * Otherwise (or if nothing qualifies) show popular products.
 */
export function recommendFor(recent: string[], wishlist: string[], products: Product[]): Product[] {
  const seeds = [...new Set([...recent, ...wishlist])].map((s) => getProduct(s)).filter(Boolean) as Product[];
  const popular = products.filter((p) => p.stock > 0).sort(byPopularity);
  if (seeds.length === 0) return popular.slice(0, 4);
  const viewed = new Set(recent);
  const picks = products
    .filter(
      (p) =>
        p.stock > 0 &&
        !viewed.has(p.slug) &&
        seeds.some((s) => s.pet === p.pet && ((s.protein !== null && s.protein === p.protein) || s.type === p.type)),
    )
    .sort(byPopularity);
  return (picks.length ? picks : popular).slice(0, 4);
}

export function HomePersonal() {
  const { recent, wishlist, stockMap, ready } = useShop();
  const live = useMemo(() => PRODUCTS.map((p) => withStock(p, stockMap)), [stockMap]);
  const recommended = useMemo(() => recommendFor(recent, wishlist, live), [recent, wishlist, live]);
  const recentProducts = useMemo(
    () => recent.map((s) => live.find((p) => p.slug === s)).filter(Boolean) as Product[],
    [recent, live],
  );
  const personalised = recent.length > 0 || wishlist.length > 0;

  return (
    <>
      <section className="section container" data-testid="recommended-for-you" data-personalised={personalised ? "1" : "0"}>
        <div className="section-head">
          <div>
            <p className="eyebrow">✨ คัดมาเพื่อน้องโดยเฉพาะ</p>
            <h2>แนะนำสำหรับคุณ</h2>
          </div>
          <p className="section-sub">
            {personalised ? "จากสินค้าที่คุณเคยดูและรายการโปรดของคุณ" : "ยังไม่มีประวัติการดู เลยขอแนะนำสินค้ายอดนิยมก่อนนะ"}
          </p>
        </div>
        <div className={ready ? "fade-in" : "is-pending"}>
          <ProductGrid products={recommended} />
        </div>
      </section>

      {recentProducts.length > 0 ? (
        <section className="section container" data-testid="recently-viewed">
          <div className="section-head">
            <div>
              <p className="eyebrow">👀 ดูล่าสุด</p>
              <h2>สินค้าที่คุณเพิ่งดู</h2>
            </div>
          </div>
          <ProductGrid products={recentProducts} />
        </section>
      ) : null}
    </>
  );
}
