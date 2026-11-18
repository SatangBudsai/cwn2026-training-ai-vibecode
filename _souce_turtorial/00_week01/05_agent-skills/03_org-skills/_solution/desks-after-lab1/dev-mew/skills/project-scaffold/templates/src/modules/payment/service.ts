import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { ValidationError } from '@/lib/app-error';
import {
  AmountMismatchError,
  InvalidOrderTransitionError,
  InvalidWebhookSignatureError,
  OrderNotFoundError,
  PackageNotFoundError,
} from './errors';
import type { OrderRecord, OrderRepository, PaymentEventRepository } from './repository';
import { thaiPayWebhookSchema, type OrderStatus } from './schema';

/** pending → paid → refunded เท่านั้น ห้ามถอย (บทเรียน BaanRai 2026) */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending: ['paid'],
  paid: ['refunded'],
  refunded: [],
};

export interface PaymentPaidEvent {
  eventId: string;
  orderId: string;
  memberId: string;
  amountSatang: number;
}

export interface PaymentServiceDeps {
  orders: OrderRepository;
  events: PaymentEventRepository;
  findPackage: (packageId: string) => Promise<{ amountSatang: number; description: string } | null>;
  /** งานหนักหลังจ่ายสำเร็จ (แต้ม, แจ้งเตือน) โยนเข้าคิว ไม่ทำใน webhook */
  publishPaid: (event: PaymentPaidEvent) => Promise<void>;
  webhookSecret: string;
  gatewayUrl: string;
  merchantId: string;
  appBaseUrl: string;
}

export function signWebhook(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = Buffer.from(signWebhook(rawBody, secret), 'hex');
  const given = Buffer.from(signature, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!ORDER_TRANSITIONS[from].includes(to)) throw new InvalidOrderTransitionError(from, to);
}

export function createPaymentService(deps: PaymentServiceDeps) {
  async function getOrder(orderId: string): Promise<OrderRecord> {
    const order = await deps.orders.findById(orderId);
    if (!order) throw new OrderNotFoundError();
    return order;
  }

  async function transition(order: OrderRecord, to: OrderStatus): Promise<void> {
    assertTransition(order.status, to);
    if (!(await deps.orders.updateStatus(order.id, order.status, to))) {
      // มีคำขออื่นเปลี่ยนสถานะไปก่อน → อ่านใหม่แล้วตรวจอีกรอบ
      const latest = await getOrder(order.id);
      if (latest.status !== to) throw new InvalidOrderTransitionError(latest.status, to);
    }
  }

  return {
    /** สร้างคำสั่งจ่าย + URL ไป gateway · return_url ผูกกับ order_id ไม่ผูกกับ session */
    async createCheckout(input: { memberId: string; packageId: string }) {
      const pkg = await deps.findPackage(input.packageId);
      if (!pkg) throw new PackageNotFoundError();
      const order = await deps.orders.create({
        memberId: input.memberId,
        amountSatang: pkg.amountSatang,
        description: pkg.description,
      });
      const returnUrl = new URL('/payment/callback', deps.appBaseUrl);
      returnUrl.searchParams.set('order_id', order.id);
      const redirectUrl = new URL(deps.gatewayUrl);
      redirectUrl.searchParams.set('merchant_id', deps.merchantId);
      redirectUrl.searchParams.set('order_id', order.id);
      redirectUrl.searchParams.set('amount_satang', String(order.amountSatang));
      redirectUrl.searchParams.set('return_url', returnUrl.toString());
      return { orderId: order.id, redirectUrl: redirectUrl.toString() };
    },

    /** หน้า callback เรียกได้โดยไม่ต้องมี session — ตอบแค่สถานะ ไม่มีข้อมูลส่วนบุคคล */
    async getOrderStatus(orderId: string): Promise<{ orderId: string; status: OrderStatus }> {
      const order = await getOrder(orderId);
      return { orderId: order.id, status: order.status };
    },

    /**
     * รับ webhook: ตรวจลายเซ็น → ตรวจข้อมูล → insert event (ซ้ำ = จบ) → เปลี่ยนสถานะ → โยนงานเข้าคิว
     * ต้องตอบ 200 ภายใน 3 วินาที จึงไม่ทำงานหนักที่นี่
     */
    async handleWebhook(rawBody: string, signature: string | null): Promise<{ duplicate: boolean }> {
      if (!verifyWebhookSignature(rawBody, signature, deps.webhookSecret)) throw new InvalidWebhookSignatureError();

      let json: unknown;
      try {
        json = JSON.parse(rawBody);
      } catch {
        throw new ValidationError('webhook ไม่ใช่ JSON');
      }
      const parsed = thaiPayWebhookSchema.safeParse(json);
      if (!parsed.success) throw new ValidationError('webhook ไม่ตรงรูปแบบ');
      const event = parsed.data;

      const order = await getOrder(event.order_id);
      if (event.amount_satang !== order.amountSatang) throw new AmountMismatchError();

      const isNew = await deps.events.insertIfNew({
        eventId: event.event_id,
        orderId: order.id,
        type: event.type,
        payloadHash: createHash('sha256').update(rawBody).digest('hex'),
      });
      if (!isNew) return { duplicate: true };

      const target: OrderStatus = event.type === 'payment.succeeded' ? 'paid' : 'refunded';
      if (order.status === target) return { duplicate: true };
      await transition(order, target);

      if (target === 'paid') {
        await deps.publishPaid({
          eventId: event.event_id,
          orderId: order.id,
          memberId: order.memberId,
          amountSatang: order.amountSatang,
        });
      }
      return { duplicate: false };
    },

    /** คืนเงิน: เปลี่ยนสถานะ paid → refunded (TODO: เรียก refund API ของ ThaiPay GW ตาม spec) */
    async refund(orderId: string): Promise<void> {
      await transition(await getOrder(orderId), 'refunded');
    },
  };
}

export type PaymentService = ReturnType<typeof createPaymentService>;
