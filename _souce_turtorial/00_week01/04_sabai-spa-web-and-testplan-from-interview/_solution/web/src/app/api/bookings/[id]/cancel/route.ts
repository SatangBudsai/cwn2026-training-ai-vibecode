import { cancelMemberBooking } from '@/lib/booking/cancel';
import { json, withApi } from '@/lib/errors';
import { requireUser } from '@/lib/session';
import type { CancelResponse } from '@/types';

export const dynamic = 'force-dynamic';

export const POST = withApi<{ id: string }>(async (_req, ctx) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  return json<CancelResponse>(await cancelMemberBooking(id, session.userId));
});
