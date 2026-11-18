import { completeBooking } from '@/lib/admin/complete';
import { json, withApi } from '@/lib/errors';
import { requireOwner } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const POST = withApi<{ id: string }>(async (_req, ctx) => {
  await requireOwner();
  const { id } = await ctx.params;
  return json(await completeBooking(id));
});
