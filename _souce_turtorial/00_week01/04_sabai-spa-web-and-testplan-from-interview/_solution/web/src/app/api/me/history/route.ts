import { getMyHistory } from '@/lib/account/service';
import { json, withApi } from '@/lib/errors';
import type { HistoryResponse } from '@/types';

export const dynamic = 'force-dynamic';

export const GET = withApi(async () => json<HistoryResponse>({ items: await getMyHistory() }));
