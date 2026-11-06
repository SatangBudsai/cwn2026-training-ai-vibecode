import "server-only";
import { getProduct } from "./products";
import { computeTotals, priceLines, type CartLine, type ShippingMethod } from "./pricing";
import { db, nextOrderId, type Order, type User } from "./store";
import { PROVINCES, validateShipping, type ShipInput } from "./validation";

export type CreateOrderResult =
  | { ok: true; order: Order }
  | { ok: false; status: number; body: Record<string, unknown> };

export interface CreateOrderInput {
  items?: unknown;
  coupon?: unknown;
  shipping?: unknown;
  payment?: unknown;
  address?: unknown;
}

export function createOrder(user: User, input: CreateOrderInput, bugMode: boolean): CreateOrderResult {
  const rawItems = Array.isArray(input.items) ? (input.items as CartLine[]) : [];
  const lines = priceLines(rawItems);
  if (lines.length === 0) {
    return { ok: false, status: 400, body: { error: "ไม่มีสินค้าในตะกร้า" } };
  }

  const a = (input.address ?? {}) as Record<string, unknown>;
  const address: ShipInput = {
    name: String(a.name ?? ""),
    phone: String(a.phone ?? ""),
    address: String(a.address ?? ""),
    province: String(a.province ?? ""),
    postcode: String(a.postcode ?? ""),
  };
  const errors = validateShipping(address, bugMode);
  if (Object.keys(errors).length > 0) {
    return { ok: false, status: 400, body: { errors } };
  }
  if (!(PROVINCES as readonly string[]).includes(address.province)) {
    address.province = PROVINCES[0];
  }

  // Stock check: stock is per product, shared by all sizes.
  const store = db();
  const qtyBySlug = new Map<string, number>();
  for (const l of lines) qtyBySlug.set(l.slug, (qtyBySlug.get(l.slug) ?? 0) + l.qty);
  for (const [slug, qty] of qtyBySlug) {
    if ((store.stock[slug] ?? 0) < qty) {
      return { ok: false, status: 409, body: { error: `สินค้าไม่พอ: ${getProduct(slug)?.name ?? slug}` } };
    }
  }

  const shipping: ShippingMethod = input.shipping === "express" ? "express" : "standard";
  const payment = input.payment === "promptpay" ? "promptpay" : "cod";
  const couponCode = typeof input.coupon === "string" && input.coupon.trim() ? input.coupon : null;
  const totals = computeTotals({ lines, couponCode, shipping, bugMode });

  for (const [slug, qty] of qtyBySlug) store.stock[slug] -= qty;

  const order: Order = {
    id: nextOrderId(),
    userId: user.id,
    items: lines.map((l) => ({
      slug: l.slug,
      name: l.name,
      size: l.size,
      price: l.price,
      qty: l.qty,
      lineTotal: l.lineTotal,
    })),
    subtotal: totals.subtotal,
    discount: totals.discount,
    shipping: totals.shipping,
    total: totals.total,
    coupon: totals.coupon?.ok ? totals.coupon.code : null,
    shippingMethod: shipping,
    payment,
    address,
    status: "received",
    createdAt: new Date().toISOString(),
  };
  store.orders.push(order);
  return { ok: true, order };
}

export function ordersFor(userId: number): Order[] {
  return db()
    .orders.filter((o) => o.userId === userId)
    .slice()
    .reverse();
}

export function findOrder(userId: number, id: string): Order | undefined {
  return db().orders.find((o) => o.id === id && o.userId === userId);
}
