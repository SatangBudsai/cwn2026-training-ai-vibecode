import { ok, route } from '@/lib/http';
import { moduleLogger } from '@/lib/logger';
import { getPaymentService, WEBHOOK_SIGNATURE_HEADER } from '@/modules/payment';

// ThaiPay GW เรียกจากภายนอก: ตรวจลายเซ็น HMAC + idempotent ใน service · ตอบ 200 ภายใน 3 วินาที
export const POST = route('payment', async (req, { requestId }) => {
  const rawBody = await req.text();
  const result = await getPaymentService().handleWebhook(rawBody, req.headers.get(WEBHOOK_SIGNATURE_HEADER));
  if (result.duplicate) moduleLogger('payment', requestId).info('duplicate webhook ignored');
  return ok({ received: true });
});
