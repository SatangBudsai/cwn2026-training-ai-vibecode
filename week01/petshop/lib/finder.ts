import { LIFE_PET_LABEL, PRODUCTS, isFood, type FoodType, type LifeStage, type Pet, type Product } from "./products";

export interface FinderInput {
  pet: Pet;
  life?: LifeStage;
  noChicken?: boolean;
  grainFree?: boolean;
  type?: FoodType;
}

export interface FinderResult {
  product: Product;
  score: number;
  reasons: string[];
}

/**
 * Pet Food Finder algorithm (see SPEC):
 * same pet only, exclude out-of-stock, exclude chicken if noChicken, only grainFree if grainFree,
 * filter type if chosen; score = 50 (life match) + 20 (type match or any) + rating × 6,
 * capped at 99%; sort by score desc then popularity desc; top 4.
 */
export function recommend(input: FinderInput, products: Product[] = PRODUCTS): FinderResult[] {
  const candidates = products.filter(
    (p) =>
      p.pet === input.pet &&
      isFood(p.type) &&
      p.stock > 0 &&
      (!input.noChicken || p.protein !== "chicken") &&
      (!input.grainFree || p.grainFree) &&
      (!input.type || p.type === input.type),
  );

  const scored = candidates.map((p) => {
    const lifeMatch = !!input.life && p.lifeStage === input.life;
    const typeMatch = !input.type || p.type === input.type;
    const raw = (lifeMatch ? 50 : 0) + (typeMatch ? 20 : 0) + p.rating * 6;
    const score = Math.min(99, Math.round(raw));
    const reasons: string[] = [];
    if (lifeMatch && input.life) reasons.push(`เหมาะกับ${LIFE_PET_LABEL[p.pet][input.life]}`);
    if (input.noChicken) reasons.push("ไม่มีไก่");
    if (p.grainFree) reasons.push("เกรนฟรี");
    reasons.push(`รีวิว ${p.rating.toFixed(1)}★`);
    return { product: p, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score || b.product.popularity - a.product.popularity);
  return scored.slice(0, 4);
}

export function parseFinderParams(sp: URLSearchParams): FinderInput | null {
  const pet = sp.get("pet");
  if (pet !== "cat" && pet !== "dog") return null;
  const life = sp.get("life");
  const type = sp.get("type");
  return {
    pet,
    life: life === "baby" || life === "adult" || life === "senior" ? life : undefined,
    noChicken: sp.get("noChicken") === "1",
    grainFree: sp.get("grainFree") === "1",
    type: type === "dry" || type === "wet" || type === "treat" ? type : undefined,
  };
}
