import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/lib/app-error';
import {
  AmountMismatchError,
  InvalidOrderTransitionError,
  InvalidWebhookSignatureError,
  OrderNotFoundError,
  PackageNotFoundError,
} from '../errors';
import type { OrderRecord, OrderRepository, PaymentEventRepository } from '../repository';
import { assertTransition, createPaymentService, signWebhook, type PaymentPaidEvent } from '../service';

const SECRET = 'test-webhook-secret';

function setup() {
  const orders = new Map<string, OrderRecord>();
  const eventIds = new Set<string>();
  const published: PaymentPaidEvent[] = [];

  const orderRepo: OrderRepository = {
    create: async (input) => {
      const order: OrderRecord = { id: randomUUID(), status: 'pending', ...input };
      orders.set(order.id, order);
      return { ...order };
    },
    findById: async (id) => (orders.has(id) ? { ...orders.get(id)! } : null),
    updateStatus: async (id, from, to) => {
      const order = orders.get(id);
      if (!order || order.status !== from) return false;
      order.status = to;
      return true;
    },
  };
  const eventRepo: PaymentEventRepository = {
    insertIfNew: async ({ eventId }) => {
      if (eventIds.has(eventId)) return false;
      eventIds.add(eventId);
      return true;
    },
  };

  const service = createPaymentService({
    orders: orderRepo,
    events: eventRepo,
    findPackage: async (id) => (id === 'pkg-1' ? { amountSatang: 150_000, description: 'แพ็กเกจทดสอบ' } : null),
    publishPaid: async (e) => {
      published.push(e);
    },
    webhookSecret: SECRET,
    gatewayUrl: 'https://sandbox.thaipay.example/pay',
    merchantId: 'M000000',
    appBaseUrl: 'http://localhost:3000',
  });
  return { service, orders, published };
}

function webhook(body: object, secret = SECRET) {
  const raw = JSON.stringify(body);
  return [raw, signWebhook(raw, secret)] as const;
}

const MEMBER_ID = randomUUID();

describe('payment service', () => {
  it('checkout ใช้ราคาจาก server และ return_url ผูกกับ order_id', async () => {
    const { service, orders } = setup();
    const { orderId, redirectUrl } = await service.createCheckout({ memberId: MEMBER_ID, packageId: 'pkg-1' });
    const url = new URL(redirectUrl);

    expect(orders.get(orderId)?.amountSatang).toBe(150_000);
    expect(url.searchParams.get('amount_satang')).toBe('150000');
    expect(url.searchParams.get('return_url')).toBe(`http://localhost:3000/payment/callback?order_id=${orderId}`);
    await expect(service.createCheckout({ memberId: MEMBER_ID, packageId: 'nope' })).rejects.toBeInstanceOf(PackageNotFoundError);
  });

  it('สถานะ order อ่านได้ด้วย order_id อย่างเดียว (ไม่ต้องมี session)', async () => {
    const { service } = setup();
    const { orderId } = await service.createCheckout({ memberId: MEMBER_ID, packageId: 'pkg-1' });
    await expect(service.getOrderStatus(orderId)).resolves.toEqual({ orderId, status: 'pending' });
    await expect(service.getOrderStatus(randomUUID())).rejects.toBeInstanceOf(OrderNotFoundError);
  });

  it('webhook ลายเซ็นผิด/ไม่มี → ปฏิเสธก่อนทำอะไร', async () => {
    const { service } = setup();
    const [raw] = webhook({ event_id: 'e1' });
    await expect(service.handleWebhook(raw, signWebhook(raw, 'wrong'))).rejects.toBeInstanceOf(InvalidWebhookSignatureError);
    await expect(service.handleWebhook(raw, null)).rejects.toBeInstanceOf(InvalidWebhookSignatureError);
    await expect(service.handleWebhook(raw, 'abc')).rejects.toBeInstanceOf(InvalidWebhookSignatureError);
  });

  it('webhook ซ้ำ 3 ครั้ง → ประมวลผลครั้งเดียว (idempotent)', async () => {
    const { service, orders, published } = setup();
    const { orderId } = await service.createCheckout({ memberId: MEMBER_ID, packageId: 'pkg-1' });
    const [raw, sig] = webhook({ event_id: 'evt-1', type: 'payment.succeeded', order_id: orderId, amount_satang: 150_000 });

    expect(await service.handleWebhook(raw, sig)).toEqual({ duplicate: false });
    expect(await service.handleWebhook(raw, sig)).toEqual({ duplicate: true });
    expect(await service.handleWebhook(raw, sig)).toEqual({ duplicate: true });
    expect(orders.get(orderId)?.status).toBe('paid');
    expect(published).toHaveLength(1);
  });

  it('event_id ใหม่แต่สถานะเดิม → ไม่ publish ซ้ำ', async () => {
    const { service, published } = setup();
    const { orderId } = await service.createCheckout({ memberId: MEMBER_ID, packageId: 'pkg-1' });
    const base = { type: 'payment.succeeded', order_id: orderId, amount_satang: 150_000 };
    await service.handleWebhook(...webhook({ ...base, event_id: 'a' }));
    expect(await service.handleWebhook(...webhook({ ...base, event_id: 'b' }))).toEqual({ duplicate: true });
    expect(published).toHaveLength(1);
  });

  it('ยอดไม่ตรง / payload ผิดรูป → ปฏิเสธ', async () => {
    const { service } = setup();
    const { orderId } = await service.createCheckout({ memberId: MEMBER_ID, packageId: 'pkg-1' });
    await expect(
      service.handleWebhook(...webhook({ event_id: 'x', type: 'payment.succeeded', order_id: orderId, amount_satang: 1 })),
    ).rejects.toBeInstanceOf(AmountMismatchError);
    await expect(service.handleWebhook(...webhook({ event_id: 'y' }))).rejects.toBeInstanceOf(ValidationError);
    const raw = 'not-json';
    await expect(service.handleWebhook(raw, signWebhook(raw, SECRET))).rejects.toBeInstanceOf(ValidationError);
  });

  it('สถานะเดินทางเดียว pending → paid → refunded ห้ามถอย', async () => {
    const { service } = setup();
    const { orderId } = await service.createCheckout({ memberId: MEMBER_ID, packageId: 'pkg-1' });
    await expect(service.refund(orderId)).rejects.toBeInstanceOf(InvalidOrderTransitionError);

    await service.handleWebhook(
      ...webhook({ event_id: 'p', type: 'payment.succeeded', order_id: orderId, amount_satang: 150_000 }),
    );
    await service.refund(orderId);
    await expect(service.getOrderStatus(orderId)).resolves.toMatchObject({ status: 'refunded' });

    expect(() => assertTransition('refunded', 'paid')).toThrow(InvalidOrderTransitionError);
    expect(() => assertTransition('paid', 'pending')).toThrow(InvalidOrderTransitionError);
  });
});
