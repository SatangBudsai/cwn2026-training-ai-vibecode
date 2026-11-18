import { describe, expect, it } from "vitest";
import { ValidationFailedError } from "@/lib/app-error";
import { InMemoryJobQueue } from "@/lib/queue";
import { createAuditService, createInMemoryAuditRepository } from "@/modules/audit";
import { createNotificationService, type NotificationJob } from "@/modules/notification";
import {
  createInMemoryPaymentRepository,
  createPaymentService,
  InvalidOrderTransitionError,
  InvalidWebhookPayloadError,
  InvalidWebhookSignatureError,
  OrderNotFoundError,
  OrderNotOwnedError,
  PaymentAmountMismatchError,
  signWebhookBody,
} from "../index";

const WEBHOOK_SECRET = "webhook-secret-for-tests";

function setup() {
  const queue = new InMemoryJobQueue<NotificationJob>();
  const audit = createAuditService({ repo: createInMemoryAuditRepository() });
  const payments = createPaymentService({
    repo: createInMemoryPaymentRepository(),
    merchantId: "m-001",
    webhookSecret: WEBHOOK_SECRET,
    gatewayUrl: "https://sandbox.thaipay.example/checkout",
    appBaseUrl: "http://localhost:3000",
    audit,
    notifications: createNotificationService({ queue }),
  });
  return { payments, queue, audit };
}

function webhook(body: Record<string, unknown>) {
  const raw = JSON.stringify(body);
  return { raw, signature: signWebhookBody(raw, WEBHOOK_SECRET) };
}

describe("payment service: orders + checkout", () => {
  it("creates a pending order in satang", async () => {
    const { payments } = setup();
    const order = await payments.createOrder({ userId: "u1", amountSatang: 150_000, description: "มัดจำ" });
    expect(order).toMatchObject({ status: "pending", currency: "THB", amountSatang: 150_000 });
    await expect(payments.createOrder({ userId: "u1", amountSatang: 10.5, description: "x" })).rejects.toBeInstanceOf(ValidationFailedError);
  });

  it("builds a gateway URL whose return_url is tied to order_id, not session", async () => {
    const { payments } = setup();
    const order = await payments.createOrder({ userId: "u1", amountSatang: 1000, description: "x" });
    const url = new URL(await payments.buildCheckoutUrl(order.id, "u1"));
    expect(url.searchParams.get("merchant_id")).toBe("m-001");
    expect(url.searchParams.get("return_url")).toBe("http://localhost:3000/payment/result?order_id=" + order.id);
    await expect(payments.buildCheckoutUrl(order.id, "someone-else")).rejects.toBeInstanceOf(OrderNotOwnedError);
    await expect(payments.buildCheckoutUrl("not-a-uuid", "u1")).rejects.toBeInstanceOf(OrderNotFoundError);
    await expect(payments.buildCheckoutUrl(crypto.randomUUID(), "u1")).rejects.toBeInstanceOf(OrderNotFoundError);
  });
});

describe("payment service: webhook", () => {
  it("rejects bad signatures before reading the payload", async () => {
    const { payments } = setup();
    await expect(payments.handleWebhook("{}", "deadbeef")).rejects.toBeInstanceOf(InvalidWebhookSignatureError);
    await expect(payments.handleWebhook("{}", null)).rejects.toBeInstanceOf(InvalidWebhookSignatureError);
  });

  it("rejects signed but malformed payloads", async () => {
    const { payments } = setup();
    const raw = "not json";
    await expect(payments.handleWebhook(raw, signWebhookBody(raw, WEBHOOK_SECRET))).rejects.toBeInstanceOf(InvalidWebhookPayloadError);
    const bad = webhook({ event_id: "e1", type: "weird" });
    await expect(payments.handleWebhook(bad.raw, bad.signature)).rejects.toBeInstanceOf(InvalidWebhookPayloadError);
  });

  it("marks the order paid once even if the gateway sends the event 3 times", async () => {
    const { payments, queue } = setup();
    const order = await payments.createOrder({ userId: "u1", amountSatang: 1000, description: "x" });
    const event = webhook({ event_id: "evt-1", type: "payment.succeeded", order_id: order.id, amount_satang: 1000 });
    expect(await payments.handleWebhook(event.raw, event.signature)).toEqual({ duplicate: false, orderId: order.id, status: "paid" });
    expect(await payments.handleWebhook(event.raw, event.signature)).toEqual({ duplicate: true });
    expect(await payments.handleWebhook(event.raw, event.signature)).toEqual({ duplicate: true });
    expect(queue.jobs).toHaveLength(1);
    expect((await payments.getPaymentResult(order.id)).message).toBe("ชำระเงินสำเร็จ");
  });

  it("ignores a second, different success event for an already paid order", async () => {
    const { payments, queue } = setup();
    const order = await payments.createOrder({ userId: "u1", amountSatang: 1000, description: "x" });
    const first = webhook({ event_id: "evt-1", type: "payment.succeeded", order_id: order.id, amount_satang: 1000 });
    const second = webhook({ event_id: "evt-2", type: "payment.succeeded", order_id: order.id, amount_satang: 1000 });
    await payments.handleWebhook(first.raw, first.signature);
    expect(await payments.handleWebhook(second.raw, second.signature)).toMatchObject({ duplicate: false, status: "paid" });
    expect(queue.jobs).toHaveLength(1);
  });

  it("keeps the order pending on payment.failed and rejects amount mismatch", async () => {
    const { payments } = setup();
    const order = await payments.createOrder({ userId: "u1", amountSatang: 1000, description: "x" });
    const failed = webhook({ event_id: "evt-f", type: "payment.failed", order_id: order.id, amount_satang: 1000 });
    expect(await payments.handleWebhook(failed.raw, failed.signature)).toMatchObject({ status: "pending" });
    const wrong = webhook({ event_id: "evt-w", type: "payment.succeeded", order_id: order.id, amount_satang: 1 });
    await expect(payments.handleWebhook(wrong.raw, wrong.signature)).rejects.toBeInstanceOf(PaymentAmountMismatchError);
  });
});

describe("payment service: one-way status", () => {
  it("allows pending → paid → refunded and never backwards", async () => {
    const { payments, audit } = setup();
    const order = await payments.createOrder({ userId: "u1", amountSatang: 1000, description: "x" });
    await expect(payments.refundOrder(order.id, "admin")).rejects.toBeInstanceOf(InvalidOrderTransitionError);
    const paid = webhook({ event_id: "evt-1", type: "payment.succeeded", order_id: order.id, amount_satang: 1000 });
    await payments.handleWebhook(paid.raw, paid.signature);
    await expect(payments.buildCheckoutUrl(order.id, "u1")).rejects.toBeInstanceOf(InvalidOrderTransitionError);
    const refunded = await payments.refundOrder(order.id, "admin");
    expect(refunded.status).toBe("refunded");
    expect(refunded.refundedAt).toBeInstanceOf(Date);
    await expect(payments.refundOrder(order.id, "admin")).rejects.toBeInstanceOf(InvalidOrderTransitionError);
    expect((await payments.getPaymentResult(order.id)).message).toBe("คืนเงินแล้ว");
    const actions = (await audit.listEntriesForTarget("order", order.id)).map((e) => e.action);
    expect(actions).toEqual(["payment.create_order", "payment.mark_paid", "payment.refund"]);
  });
});
