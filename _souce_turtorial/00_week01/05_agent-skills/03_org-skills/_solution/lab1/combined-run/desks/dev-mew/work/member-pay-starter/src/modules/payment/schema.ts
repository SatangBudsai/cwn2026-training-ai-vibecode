import { z } from "zod";

export const THAIPAY_SIGNATURE_HEADER = "x-thaipay-signature";

/** สถานะเดินทางเดียว: pending → paid → refunded (ห้ามถอย) */
export const OrderStatusSchema = z.enum(["pending", "paid", "refunded"]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const ALLOWED_ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending: ["paid"],
  paid: ["refunded"],
  refunded: [],
};

export const CreateOrderInputSchema = z.object({
  userId: z.string().min(1),
  /** เก็บเงินเป็นสตางค์ (จำนวนเต็ม) ไม่ใช้ทศนิยม */
  amountSatang: z.number().int().positive().max(100_000_000),
  description: z.string().trim().min(1).max(200),
});
export type CreateOrderInput = z.input<typeof CreateOrderInputSchema>;

export const OrderIdSchema = z.uuid();

/** รูปแบบ webhook ของ ThaiPay GW (ตามที่ใช้ใน BaanRai 2026) */
export const ThaiPayWebhookSchema = z.object({
  event_id: z.string().min(1).max(100),
  type: z.enum(["payment.succeeded", "payment.failed"]),
  order_id: z.uuid(),
  amount_satang: z.number().int().positive(),
});
export type ThaiPayWebhook = z.infer<typeof ThaiPayWebhookSchema>;
