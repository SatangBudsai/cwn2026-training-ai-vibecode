import { getBookingDetail } from '@/lib/booking/read';
import { getNow } from '@/lib/clock';
import { getPool } from '@/lib/db';
import { ApiError, json, withApi } from '@/lib/errors';
import { requireUser } from '@/lib/session';
import type { GetBookingResponse } from '@/types';

export const dynamic = 'force-dynamic';

export const GET = withApi<{ id: string }>(async (_req, ctx) => {
  const session = await requireUser();
  const { id } = await ctx.params;
  const booking = await getBookingDetail(getPool(), id, await getNow());
  // ของคนอื่นตอบเหมือนไม่พบ (NFR-12, E252)
  if (!booking || (booking.userId !== session.userId && session.role !== 'OWNER')) {
    throw new ApiError('booking-not-found');
  }
  return json<GetBookingResponse>({ booking });
});
