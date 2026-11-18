/**
 * Pricing rules shared by the client (cart / checkout summary) and the server
 * (coupon API, order API). Pure functions only.
 */
import { getProduct, isFood, type Pet, type ProductType } from "./products";

export type ShippingMethod = "standard" | "express";

export interface CartLine {
  slug: string;
  size: string;
  qty: number;
}

export interface PricedLine extends CartLine {
  name: string;
  pet: Pet;
  type: ProductType;
  price: number;
  lineTotal: number;
}

export interface CouponResult {
  ok: boolean;
  code: string;
  discount: number;
  freeShipping: boolean;
  message: string;
}

export interface Totals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon: CouponResult | null;
}

export const FREE_SHIPPING_MIN = 999;
export const STANDARD_SHIPPING = 50;
export const EXPRESS_SHIPPING = 120;

export const COUPON_MESSAGES = {
  notFound: "ไม่พบคูปองนี้",
  expired: "คูปองนี้หมดอายุแล้ว",
  catMin: "ต้องซื้ออาหารแมวขั้นต่ำ ฿500",
} as const;

/** Money format everywhere: ฿1,234 (no decimals). */
export function formatBaht(amount: number): string {
  const n = Math.round(amount);
  const abs = Math.abs(n).toLocaleString("en-US");
  return n < 0 ? `-฿${abs}` : `฿${abs}`;
}

/** Resolve cart lines against the catalogue. Unknown products/sizes are dropped. */
export function priceLines(lines: CartLine[]): PricedLine[] {
  const out: PricedLine[] = [];
  for (const line of lines) {
    const p = getProduct(line.slug);
    if (!p) continue;
    const size = p.sizes.find((s) => s.label === line.size);
    if (!size) continue;
    const qty = Math.max(0, Math.floor(Number(line.qty) || 0));
    if (qty <= 0) continue;
    out.push({
      slug: p.slug,
      size: size.label,
      qty,
      name: p.name,
      pet: p.pet,
      type: p.type,
      price: size.price,
      lineTotal: size.price * qty,
    });
  }
  return out;
}

export function subtotalOf(lines: Pick<PricedLine, "lineTotal">[]): number {
  return lines.reduce((sum, l) => sum + l.lineTotal, 0);
}

export function normalizeCode(code: string | null | undefined): string {
  return String(code ?? "").trim().toUpperCase();
}

/**
 * Evaluate a coupon code against priced cart lines.
 * `bugMode` (training bug #1): PAW10 gives 1% instead of 10%.
 */
export function evaluateCoupon(
  rawCode: string,
  lines: Pick<PricedLine, "lineTotal" | "pet" | "type">[],
  bugMode = false,
): CouponResult {
  const code = normalizeCode(rawCode);
  const subtotal = subtotalOf(lines);
  const fail = (message: string): CouponResult => ({
    ok: false,
    code,
    discount: 0,
    freeShipping: false,
    message,
  });
  const success = (discount: number, freeShipping = false): CouponResult => ({
    ok: true,
    code,
    discount,
    freeShipping,
    message: `ใช้คูปอง ${code} แล้ว`,
  });

  switch (code) {
    case "PAW10": {
      const percent = bugMode ? 1 : 10;
      return success(Math.floor((subtotal * percent) / 100));
    }
    case "FREESHIP":
      return success(0, true);
    case "NEWCAT50": {
      // Only cat FOOD (dry/wet/treat) counts toward the ฿500 minimum.
      const catSubtotal = lines.filter((l) => l.pet === "cat" && isFood(l.type)).reduce((s, l) => s + l.lineTotal, 0);
      if (catSubtotal < 500) return fail(COUPON_MESSAGES.catMin);
      return success(50);
    }
    case "SUMMER20":
      return fail(COUPON_MESSAGES.expired);
    default:
      return fail(COUPON_MESSAGES.notFound);
  }
}

export function shippingCost(subtotal: number, method: ShippingMethod): number {
  if (method === "express") return EXPRESS_SHIPPING;
  return subtotal >= FREE_SHIPPING_MIN ? 0 : STANDARD_SHIPPING;
}

export function computeTotals(opts: {
  lines: PricedLine[];
  couponCode?: string | null;
  shipping?: ShippingMethod;
  bugMode?: boolean;
}): Totals {
  const { lines, couponCode, shipping = "standard", bugMode = false } = opts;
  const subtotal = subtotalOf(lines);
  const coupon = couponCode ? evaluateCoupon(couponCode, lines, bugMode) : null;
  const discount = coupon?.ok ? Math.min(coupon.discount, subtotal) : 0;
  let ship = lines.length === 0 ? 0 : shippingCost(subtotal, shipping);
  if (coupon?.ok && coupon.freeShipping) ship = 0;
  const total = Math.max(0, subtotal - discount + ship);
  return { subtotal, discount, shipping: ship, total, coupon };
}

export function freeShippingRemaining(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_MIN - subtotal);
}
