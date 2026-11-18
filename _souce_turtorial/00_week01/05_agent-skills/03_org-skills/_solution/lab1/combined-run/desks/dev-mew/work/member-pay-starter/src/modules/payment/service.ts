import { ValidationFailedError } from "@/lib/app-error";
import { systemClock, type Clock } from "@/lib/clock";
import { createId } from "@/lib/ids";
import type { AuditRecorder } from "@/modules/audit";
import type { NotificationService } from "@/modules/notification";
import {
  InvalidOrderTransitionError,
  InvalidWebhookPayloadError,
  InvalidWebhookSignatureError,
  OrderNotFoundError,
  OrderNotOwnedError,
  PaymentAmountMismatchError,
} from "./errors";
import type { OrderRecord, PaymentRepository } from "./repository";
import {
  ALLOWED_ORDER_TRANSITIONS,
  CreateOrderInputSchema,
  OrderIdSchema,
  ThaiPayWebhookSchema,
  type CreateOrderInput,
  type OrderStatus,
} from "./schema";
import { hashPayload, isValidWebhookSignature } from "./signature";

export interface PaymentServiceDeps {
  repo: PaymentRepository;
  merchantId: string;
  webhookSecret: string;
  gatewayUrl: string;
  appBaseUrl: string;
  clock?: Clock;
  audit?: AuditRecorder;
  notifications?: Pick<NotificationService, "enqueueNotification">;
}

export type WebhookOutcome = { duplicate: true } | { duplicate: false; orderId: string; status: OrderStatus };

export interface PaymentResult {
  orderId: string;
  status: OrderStatus;
  message: string;
}

export interface PaymentService {
  createOrder(input: CreateOrderInput): Promise<OrderRecord>;
  buildCheckoutUrl(orderId: string, userId: string): Promise<string>;
  handleWebhook(rawBody: string, signature: string | null): Promise<WebhookOutcome>;
  refundOrder(orderId: string, actorId: string): Promise<OrderRecord>;
  getPaymentResult(orderId: string): Promise<PaymentResult>;
}

const RESULT_MESSAGES: Record<OrderStatus, string> = {
  pending: "กำลังรอผลการชำระเงิน",
  paid: "ชำระเงินสำเร็จ",
  refunded: "คืนเงินแล้ว",
};

export function createPaymentService(deps: PaymentServiceDeps): PaymentService {
  const { repo, merchantId, webhookSecret, gatewayUrl, appBaseUrl, clock = systemClock, audit, notifications } = deps;

  async function loadOrder(orderId: string): Promise<OrderRecord> {
    const parsedId = OrderIdSchema.safeParse(orderId);
    if (!parsedId.success) throw new OrderNotFoundError();
    const order = await repo.findOrderById(parsedId.data);
    if (!order) throw new OrderNotFoundError();
    return order;
  }

  async function transition(order: OrderRecord, to: OrderStatus): Promise<void> {
    const allowed = ALLOWED_ORDER_TRANSITIONS[order.status].includes(to);
    if (!allowed || !(await repo.transitionOrderStatus(order.id, order.status, to, clock()))) {
      throw new InvalidOrderTransitionError(order.status, to);
    }
  }

  return {
    async createOrder(input) {
      const parsed = CreateOrderInputSchema.safeParse(input);
      if (!parsed.success) throw new ValidationFailedError(undefined, { cause: parsed.error });
      const order: OrderRecord = {
        id: createId(),
        ...parsed.data,
        currency: "THB",
        status: "pending",
        createdAt: clock(),
        paidAt: null,
        refundedAt: null,
      };
      await repo.insertOrder(order);
      await audit?.recordAction({ actorId: order.userId, action: "payment.create_order", targetType: "order", targetId: order.id });
      return order;
    },

    async buildCheckoutUrl(orderId, userId) {
      const order = await loadOrder(orderId);
      if (order.userId !== userId) throw new OrderNotOwnedError();
      if (order.status !== "pending") throw new InvalidOrderTransitionError(order.status, "paid");
      const url = new URL(gatewayUrl);
      url.searchParams.set("merchant_id", merchantId);
      url.searchParams.set("order_id", order.id);
      url.searchParams.set("amount_satang", String(order.amountSatang));
      // callback ผูกกับ order_id ไม่ผูกกับ session (บทเรียน ShopDee 2025)
      url.searchParams.set("return_url", new URL("/payment/result?order_id=" + order.id, appBaseUrl).toString());
      return url.toString();
    },

    async handleWebhook(rawBody, signature) {
      // 1) ตรวจลายเซ็นก่อนทุกอย่าง
      if (!isValidWebhookSignature(rawBody, signature, webhookSecret)) throw new InvalidWebhookSignatureError();
      let json: unknown;
      try {
        json = JSON.parse(rawBody);
      } catch (error) {
        throw new InvalidWebhookPayloadError({ cause: error });
      }
      const parsed = ThaiPayWebhookSchema.safeParse(json);
      if (!parsed.success) throw new InvalidWebhookPayloadError({ cause: parsed.error });
      const event = parsed.data;

      // 2) idempotency: insert event ก่อน ถ้าชน unique = ตอบ 200 แล้วจบ
      const inserted = await repo.insertPaymentEvent({ eventId: event.event_id, receivedAt: clock(), payloadHash: hashPayload(rawBody) });
      if (!inserted) return { duplicate: true };

      const order = await loadOrder(event.order_id);
      if (event.type === "payment.failed" || order.status !== "pending") {
        return { duplicate: false, orderId: order.id, status: order.status };
      }
      if (event.amount_satang !== order.amountSatang) throw new PaymentAmountMismatchError();
      await transition(order, "paid");
      await audit?.recordAction({
        actorId: "thaipay-gw",
        action: "payment.mark_paid",
        targetType: "order",
        targetId: order.id,
        meta: { eventId: event.event_id },
      });
      // 3) งานหนักโยนเข้าคิว เพื่อตอบ gateway ภายใน 3 วินาที
      await notifications?.enqueueNotification({
        channel: "line",
        recipientUserId: order.userId,
        template: "payment-succeeded",
        data: { orderId: order.id },
      });
      return { duplicate: false, orderId: order.id, status: "paid" };
    },

    async refundOrder(orderId, actorId) {
      const order = await loadOrder(orderId);
      await transition(order, "refunded");
      await audit?.recordAction({ actorId, action: "payment.refund", targetType: "order", targetId: order.id });
      await notifications?.enqueueNotification({
        channel: "email",
        recipientUserId: order.userId,
        template: "payment-refunded",
        data: { orderId: order.id },
      });
      return loadOrder(order.id);
    },

    async getPaymentResult(orderId) {
      // ไม่ต้องมี session: หน้า callback อ่านผลจาก order_id เท่านั้น ไม่คืนข้อมูลส่วนตัว
      const order = await loadOrder(orderId);
      return { orderId: order.id, status: order.status, message: RESULT_MESSAGES[order.status] };
    },
  };
}
