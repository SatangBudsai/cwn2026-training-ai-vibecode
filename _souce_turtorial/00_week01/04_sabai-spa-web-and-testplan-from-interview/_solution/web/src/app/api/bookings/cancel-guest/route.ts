import { cancelGuestBooking } from '@/lib/booking/cancel';
import { json, readJson, withApi } from '@/lib/errors';
import type { CancelGuestRequest, CancelResponse } from '@/types';

export const dynamic = 'force-dynamic';

export const POST = withApi(async (req) => {
  const body = await readJson<Partial<CancelGuestRequest> | null>(req);
  return json<CancelResponse>(await cancelGuestBooking(body?.bookingCode, body?.phone));
});
