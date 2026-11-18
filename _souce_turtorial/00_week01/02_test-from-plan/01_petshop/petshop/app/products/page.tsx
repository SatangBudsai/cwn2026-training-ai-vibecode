import type { Metadata } from "next";
import { CatalogFilters, ClearFiltersButton } from "@/components/CatalogFilters";
import { ProductGrid } from "@/components/ProductCard";
import { catalogQueryString, filterProducts, parseCatalogQuery } from "@/lib/catalog";
import { liveProducts } from "@/lib/store";

export const metadata: Metadata = { title: "สินค้าทั้งหมด" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const query = parseCatalogQuery(await searchParams);
  const items = filterProducts(query, liveProducts());
  const title = query.pet === "cat" ? "อาหารแมว" : query.pet === "dog" ? "อาหารสุนัข" : "สินค้าทั้งหมด";

  return (
    <div className="container page catalog">
      <header className={`page-hero catalog-hero pet-${query.pet ?? "all"}`}>
        <div>
          <p className="eyebrow">🛍️ แคตตาล็อก PawPantry</p>
          <h1>{title}</h1>
          {query.q ? (
            <p className="search-note">
              ผลการค้นหา “<strong>{query.q}</strong>”
            </p>
          ) : (
            <p className="search-note">กรองตามประเภท ช่วงวัย หรือสูตรเกรนฟรีได้เลย</p>
          )}
        </div>
        <span className="hero-emoji" aria-hidden="true">
          {query.pet === "cat" ? "🐱" : query.pet === "dog" ? "🐶" : "🐾"}
        </span>
      </header>

      <CatalogFilters key={catalogQueryString(query)} query={query} />

      <p className="result-count" data-testid="result-count" aria-live="polite">
        พบ {items.length} รายการ
      </p>

      {items.length > 0 ? (
        <ProductGrid products={items} />
      ) : (
        <div className="empty-state" data-testid="empty-results">
          <span className="empty-emoji" aria-hidden="true">
            🔍🐾
          </span>
          <h2>ไม่พบสินค้าที่ตรงกับการค้นหา</h2>
          <p>ลองเปลี่ยนคำค้นหรือล้างตัวกรองดูนะ</p>
          <ClearFiltersButton />
        </div>
      )}
    </div>
  );
}
