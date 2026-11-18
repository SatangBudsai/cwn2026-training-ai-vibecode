import { z } from 'zod';

export const ORDER_STATUSES = ['pending', 'paid', 'refunded'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** ราคาไม่รับจาก client — client ส่งแค่ packageId แล้ว server หาราคาเอง */
export const checkoutInputSchema = z.object({
  packageId: z.string().min(1).max(64),
});
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export const orderIdSchema = z.string().uuid();

/** payload webhook ของ ThaiPay GW (ตรวจลายเซ็นก่อน parse เสมอ) */
export const thaiPayWebhookSchema = z.object({
  event_id: z.string().min(1),
  type: z.enum(['payment.succeeded', 'payment.refunded']),
  order_id: z.string().uuid(),
  amount_satang: z.number().int().nonnegative(),
});
export type ThaiPayWebhook = z.infer<typeof thaiPayWebhookSchema>;

export const WEBHOOK_SIGNATURE_HEADER = 'x-thaipay-signature';
