"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { catalogQueryString, type CatalogQuery, type SortKey } from "@/lib/catalog";
import type { LifeStage, Pet, ProductType } from "@/lib/products";

export function CatalogFilters({ query }: { query: CatalogQuery }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Accumulate quick successive changes made before the navigation finishes.
  const pendingRef = useRef<CatalogQuery>(query);

  const go = (patch: Partial<CatalogQuery>) => {
    const next = { ...pendingRef.current, ...patch };
    pendingRef.current = next;
    startTransition(() => {
      router.push(`/products${catalogQueryString(next)}`, { scroll: false });
    });
  };

  const pets: { key: "all" | Pet; label: string; emoji: string }[] = [
    { key: "all", label: "ทั้งหมด", emoji: "🐾" },
    { key: "cat", label: "แมว", emoji: "🐱" },
    { key: "dog", label: "สุนัข", emoji: "🐶" },
  ];
  const currentPet = query.pet ?? "all";

  return (
    <div className={`filters ${pending ? "is-pending" : ""}`} aria-busy={pending}>
      <div className="chip-group" role="group" aria-label="ประเภทสัตว์เลี้ยง">
        {pets.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`chip chip-${p.key} ${currentPet === p.key ? "active" : ""}`}
            data-testid={`filter-pet-${p.key}`}
            aria-pressed={currentPet === p.key}
            onClick={() => go({ pet: p.key === "all" ? undefined : p.key })}
          >
            <span aria-hidden="true">{p.emoji}</span> {p.label}
          </button>
        ))}
      </div>

      <div className="filter-field">
        <label htmlFor="filter-type">ประเภทสินค้า</label>
        <select
          id="filter-type"
          data-testid="filter-type"
          defaultValue={query.type ?? "all"}
          onChange={(e) => go({ type: e.target.value === "all" ? undefined : (e.target.value as ProductType) })}
        >
          <option value="all">ทั้งหมด</option>
          <option value="dry">อาหารเม็ด</option>
          <option value="wet">อาหารเปียก</option>
          <option value="treat">ขนม</option>
          <option value="toy">ของเล่น</option>
          <option value="accessory">ของใช้</option>
        </select>
      </div>

      <div className="filter-field">
        <label htmlFor="filter-life">ช่วงวัย</label>
        <select
          id="filter-life"
          data-testid="filter-life"
          defaultValue={query.life ?? "all"}
          onChange={(e) => go({ life: e.target.value === "all" ? undefined : (e.target.value as LifeStage) })}
        >
          <option value="all">ทุกช่วงวัย</option>
          <option value="baby">วัยเด็ก</option>
          <option value="adult">วัยโต</option>
          <option value="senior">สูงวัย</option>
        </select>
      </div>

      <label className="switch" htmlFor="filter-grainfree">
        <input
          id="filter-grainfree"
          type="checkbox"
          data-testid="filter-grainfree"
          defaultChecked={!!query.grainFree}
          onChange={(e) => go({ grainFree: e.target.checked })}
        />
        <span className="switch-track" aria-hidden="true">
          <span className="switch-thumb" />
        </span>
        เกรนฟรีเท่านั้น
      </label>

      <div className="filter-field sort-field">
        <label htmlFor="sort-select">เรียงตาม</label>
        <select
          id="sort-select"
          data-testid="sort-select"
          defaultValue={query.sort}
          onChange={(e) => go({ sort: e.target.value as SortKey })}
        >
          <option value="popular">ยอดนิยม</option>
          <option value="price-asc">ราคา: ต่ำ → สูง</option>
          <option value="price-desc">ราคา: สูง → ต่ำ</option>
          <option value="rating">คะแนนรีวิว</option>
        </select>
      </div>
    </div>
  );
}

export function ClearFiltersButton() {
  const router = useRouter();
  return (
    <button type="button" className="btn btn-primary" data-testid="clear-filters" onClick={() => router.push("/products")}>
      ล้างตัวกรองทั้งหมด
    </button>
  );
}
