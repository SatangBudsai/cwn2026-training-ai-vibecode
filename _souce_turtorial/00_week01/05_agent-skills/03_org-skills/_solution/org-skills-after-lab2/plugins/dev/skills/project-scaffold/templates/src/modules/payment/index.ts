// public interface ของโมดูล payment (coding-rules ข้อ 1)
import { getEnv } from '@/config/env';
import { prisma } from '@/lib/db';
import { getQueue, QUEUE_NAMES } from '@/lib/queue';
import { findPackage } from './catalog';
import { createPrismaOrderRepository, createPrismaPaymentEventRepository } from './repository';
import { createPaymentService, type PaymentService } from './service';

export * from './errors';
export { checkoutInputSchema, orderIdSchema, WEBHOOK_SIGNATURE_HEADER, type OrderStatus } from './schema';
export { PACKAGES } from './catalog';
export { signWebhook, type PaymentPaidEvent } from './service';

let service: PaymentService | undefined;

export function getPaymentService(): PaymentService {
  const env = getEnv();
  service ??= createPaymentService({
    orders: createPrismaOrderRepository(prisma),
    events: createPrismaPaymentEventRepository(prisma),
    findPackage,
    // jobId = event id → BullMQ ไม่รับ job ซ้ำอีกชั้น
    publishPaid: async (event) => {
      await getQueue(QUEUE_NAMES.paymentPaid).add(QUEUE_NAMES.paymentPaid, event, { jobId: event.eventId });
    },
    webhookSecret: env.THAIPAY_WEBHOOK_SECRET,
    gatewayUrl: env.THAIPAY_GATEWAY_URL,
    merchantId: env.THAIPAY_MERCHANT_ID,
    appBaseUrl: env.APP_BASE_URL,
  });
  return service;
}
