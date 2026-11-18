import { getMyBookings } from '@/lib/account/service';
import { json, withApi } from '@/lib/errors';
import type { MyBookingsResponse } from '@/types';

export const dynamic = 'force-dynamic';

export const GET = withApi(async () => json<MyBookingsResponse>({ bookings: await getMyBookings() }));
