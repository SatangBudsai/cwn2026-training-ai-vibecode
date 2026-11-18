import { ok, parseInput, readJson, route } from '@/lib/http';
import { getAuditService } from '@/modules/audit';
import { requireUser } from '@/modules/auth';
import { checkoutInputSchema, getPaymentService } from '@/modules/payment';

export const POST = route('payment', async (req) => {
  const user = await requireUser(req, ['member']);
  const input = parseInput(checkoutInputSchema, await readJson(req));
  const checkout = await getPaymentService().createCheckout({ memberId: user.userId, packageId: input.packageId });
  await getAuditService().recordAudit({
    actorId: user.userId,
    action: 'payment.checkout_created',
    target: `order:${checkout.orderId}`,
    meta: { packageId: input.packageId },
  });
  return ok(checkout, 201);
});
