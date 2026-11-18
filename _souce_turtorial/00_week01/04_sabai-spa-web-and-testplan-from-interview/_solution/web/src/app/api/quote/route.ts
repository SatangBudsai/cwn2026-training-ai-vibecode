import { getNow } from '@/lib/clock';
import { bangkokDate } from '@/lib/date';
import { getPool } from '@/lib/db';
import { ApiError, json, readJson, withApi } from '@/lib/errors';
import { loadAndQuote } from '@/lib/pricing/quote';
import { getSession } from '@/lib/session';
import type { QuoteRequest, QuoteResponse } from '@/types';

export const dynamic = 'force-dynamic';

export const POST = withApi(async (req) => {
  const body = await readJson<QuoteRequest | null>(req);
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new ApiError('validation');

  const session = await getSession();
  const now = await getNow();
  const { internal: _internal, ...response } = await loadAndQuote(getPool(), body, {
    // OWNER นับเป็นแขก (สัญญา 2.2)
    userId: session?.role === 'CUSTOMER' ? session.userId : null,
    today: bangkokDate(now),
    now,
    forUpdate: false,
  });
  return json<QuoteResponse>(response);
});
