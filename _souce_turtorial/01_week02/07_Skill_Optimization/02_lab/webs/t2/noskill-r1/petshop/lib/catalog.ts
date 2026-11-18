import {
  PRODUCTS,
  PROTEIN_LABEL,
  lowestPrice,
  type ProductType,
  type LifeStage,
  type Pet,
  type Product,
} from "./products";

export type SortKey = "popular" | "price-asc" | "price-desc" | "rating";
export const SORT_KEYS: SortKey[] = ["popular", "price-asc", "price-desc", "rating"];

export interface CatalogQuery {
  pet?: Pet;
  type?: ProductType;
  life?: LifeStage;
  grainFree?: boolean;
  q?: string;
  sort: SortKey;
}

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

function pick(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

export function parseCatalogQuery(params: RawParams): CatalogQuery {
  const pet = pick(params, "pet");
  const type = pick(params, "type");
  const life = pick(params, "life");
  const sort = pick(params, "sort");
  const gf = pick(params, "grainFree");
  const q = pick(params, "q")?.trim();
  return {
    pet: pet === "cat" || pet === "dog" ? pet : undefined,
    type:
      type === "dry" || type === "wet" || type === "treat" || type === "toy" || type === "accessory"
        ? type
        : undefined,
    life: life === "baby" || life === "adult" || life === "senior" ? life : undefined,
    grainFree: gf === "1" || gf === "true",
    q: q ? q : undefined,
    sort: SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : "popular",
  };
}

export function matchesSearch(p: Product, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const parts = [p.name, p.nameEn];
  if (p.protein) parts.push(p.protein, PROTEIN_LABEL[p.protein]);
  const hay = parts.join(" ").toLowerCase();
  return hay.includes(needle);
}

export function filterProducts(query: CatalogQuery, products: Product[] = PRODUCTS): Product[] {
  const items = products.filter(
    (p) =>
      (!query.pet || p.pet === query.pet) &&
      (!query.type || p.type === query.type) &&
      (!query.life || p.lifeStage === query.life) &&
      (!query.grainFree || p.grainFree) &&
      (!query.q || matchesSearch(p, query.q)),
  );
  const byPop = (a: Product, b: Product) => b.popularity - a.popularity;
  const sorters: Record<SortKey, (a: Product, b: Product) => number> = {
    popular: byPop,
    "price-asc": (a, b) => lowestPrice(a) - lowestPrice(b) || byPop(a, b),
    "price-desc": (a, b) => lowestPrice(b) - lowestPrice(a) || byPop(a, b),
    rating: (a, b) => b.rating - a.rating || byPop(a, b),
  };
  return [...items].sort(sorters[query.sort]);
}

export function catalogQueryString(query: Partial<CatalogQuery>): string {
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.pet) sp.set("pet", query.pet);
  if (query.type) sp.set("type", query.type);
  if (query.life) sp.set("life", query.life);
  if (query.grainFree) sp.set("grainFree", "1");
  if (query.sort && query.sort !== "popular") sp.set("sort", query.sort);
  const s = sp.toString();
  return s ? `?${s}` : "";
}
