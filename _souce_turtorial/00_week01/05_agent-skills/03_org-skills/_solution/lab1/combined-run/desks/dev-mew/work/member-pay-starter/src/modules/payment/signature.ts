import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** HMAC-SHA256 (hex) ของ raw body ด้วย THAIPAY_WEBHOOK_SECRET */
export function signWebhookBody(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function isValidWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = Buffer.from(signWebhookBody(rawBody, secret));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hashPayload(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}
