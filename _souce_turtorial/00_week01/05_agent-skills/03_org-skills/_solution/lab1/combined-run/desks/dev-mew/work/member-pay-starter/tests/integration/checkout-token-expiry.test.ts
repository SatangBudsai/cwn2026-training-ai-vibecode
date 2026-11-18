/**
 * Regression ของบั๊ก ShopDee 2025 (token หมดอายุกลางการชำระเงิน)
 * ตั้ง access อายุ 5 วินาที → จ่ายเงิน (ผู้ใช้ค้างหน้า gateway 10 นาที) → ต้องกลับมาเห็น "ชำระเงินสำเร็จ"
 * หมายเหตุ: เป็น integration test ระดับ service (Vitest) — E2E ด้วย Playwright (tests/e2e/checkout.spec.ts) ยังไม่ได้ทำ — ต้องมี PostgreSQL + browser
 */
import { describe, expect, it } from "vitest";
import { InMemoryJobQueue } from "@/lib/queue";
import { createAuditService, createInMemoryAuditRepository } from "@/modules/audit";
import { createAuthService, createInMemoryAuthRepository, InvalidTokenError, redirectToPaymentGateway } from "@/modules/auth";
import { createNotificationService, type NotificationJob } from "@/modules/notification";
import { createInMemoryPaymentRepository, createPaymentService, signWebhookBody } from "@/modules/payment";

const WEBHOOK_SECRET = "webhook-secret-for-tests";

describe("checkout survives access-token expiry (ShopDee 2025 regression)", () => {
  it("returns to 'ชำระเงินสำเร็จ' without a session and the user can continue", async () => {
    let nowMs = Date.parse("2026-11-03T09:00:00Z");
    const clock = () => new Date(nowMs);
    const audit = createAuditService({ repo: createInMemoryAuditRepository(), clock });
    const auth = createAuthService({
      repo: createInMemoryAuthRepository(),
      accessSecret: "a".repeat(32),
      refreshSecret: "r".repeat(32),
      accessTtlSeconds: 5,
      clock,
      audit,
    });
    const payments = createPaymentService({
      repo: createInMemoryPaymentRepository(),
      merchantId: "m-001",
      webhookSecret: WEBHOOK_SECRET,
      gatewayUrl: "https://sandbox.thaipay.example/checkout",
      appBaseUrl: "http://localhost:3000",
      clock,
      audit,
      notifications: createNotificationService({ queue: new InMemoryJobQueue<NotificationJob>() }),
    });

    await auth.registerUser({ email: "buyer@example.com", password: "correct-horse-battery" });
    let { tokens, user } = await auth.loginUser({ email: "buyer@example.com", password: "correct-horse-battery" });
    const order = await payments.createOrder({ userId: user.id, amountSatang: 49_900, description: "สมาชิกรายปี" });

    nowMs += 4_000; // access เหลือ 1 วินาที
    let navigatedTo = "";
    await redirectToPaymentGateway({
      refreshSession: async () => {
        tokens = await auth.refreshSession(tokens.refreshToken);
      },
      createCheckoutUrl: async () => {
        const claims = auth.verifyAccess(tokens.accessToken);
        return payments.buildCheckoutUrl(order.id, claims.sub);
      },
      navigate: (url) => {
        navigatedTo = url;
      },
    });
    const returnUrl = new URL(new URL(navigatedTo).searchParams.get("return_url") ?? "");

    // ผู้ใช้ค้างหน้า gateway 10 นาที (สแกน QR / รอ OTP ธนาคาร) — access หมดแน่นอน
    nowMs += 10 * 60_000;
    const raw = JSON.stringify({ event_id: "evt-1", type: "payment.succeeded", order_id: order.id, amount_satang: 49_900 });
    await payments.handleWebhook(raw, signWebhookBody(raw, WEBHOOK_SECRET));
    expect(() => auth.verifyAccess(tokens.accessToken)).toThrow(InvalidTokenError);

    // หน้า callback อ่านผลจาก order_id อย่างเดียว ไม่ต้องมี session
    const result = await payments.getPaymentResult(returnUrl.searchParams.get("order_id") ?? "");
    expect(result).toMatchObject({ status: "paid", message: "ชำระเงินสำเร็จ" });

    // refresh token ที่หมุนก่อนไป gateway ยังใช้ต่อได้ → ไม่เด้งไปหน้า login
    tokens = await auth.refreshSession(tokens.refreshToken);
    expect(auth.verifyAccess(tokens.accessToken).sub).toBe(user.id);
  });
});
