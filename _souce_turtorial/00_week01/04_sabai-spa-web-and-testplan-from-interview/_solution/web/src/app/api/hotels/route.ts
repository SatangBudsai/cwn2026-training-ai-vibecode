import { listHotels } from '@/lib/catalog';
import { json, withApi } from '@/lib/errors';
import type { HotelsResponse } from '@/types';

export const dynamic = 'force-dynamic';

export const GET = withApi(async () => json<HotelsResponse>({ hotels: await listHotels() }));
