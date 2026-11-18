import { getClock } from '@/lib/clock';
import { json, withApi } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export const GET = withApi(async () => json(await getClock()));
