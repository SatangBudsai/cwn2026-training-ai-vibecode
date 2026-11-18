import { requireCurrentUser } from '@/lib/account/service';
import { json, withApi } from '@/lib/errors';
import type { MeResponse } from '@/types';

export const dynamic = 'force-dynamic';

export const GET = withApi(async () => json<MeResponse>(await requireCurrentUser()));
