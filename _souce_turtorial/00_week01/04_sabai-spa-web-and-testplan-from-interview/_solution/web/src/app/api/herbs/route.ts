import { listHerbs } from '@/lib/catalog';
import { json, withApi } from '@/lib/errors';
import type { HerbsResponse } from '@/types';

export const dynamic = 'force-dynamic';

export const GET = withApi(async () => json<HerbsResponse>({ herbs: await listHerbs() }));
