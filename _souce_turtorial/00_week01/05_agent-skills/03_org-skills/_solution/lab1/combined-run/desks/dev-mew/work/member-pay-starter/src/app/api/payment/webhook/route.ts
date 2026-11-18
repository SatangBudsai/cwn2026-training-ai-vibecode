import { getContainer } from "@/lib/container";
import { handleRoute, respondOk } from "@/lib/http";
import { THAIPAY_SIGNATURE_HEADER } from "@/modules/payment";

export const dynamic = "force-dynamic";

/** ตรวจ HMAC ก่อนทุกอย่าง → idempotent ด้วย event_id → ตอบ 200 เร็ว งานหนักเข้าคิว */
export function POST(request: Request) {
  return handleRoute(request, "payment", async () => {
    const rawBody = await request.text();
    const outcome = await getContainer().payments.handleWebhook(rawBody, request.headers.get(THAIPAY_SIGNATURE_HEADER));
    return respondOk(outcome);
  });
}
