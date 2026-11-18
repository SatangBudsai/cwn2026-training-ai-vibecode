import { listServices } from '@/lib/catalog';
import { json, withApi } from '@/lib/errors';
import type { ServicesResponse } from '@/types';

export const dynamic = 'force-dynamic';

export const GET = withApi(async () => json<ServicesResponse>({ services: await listServices() }));
