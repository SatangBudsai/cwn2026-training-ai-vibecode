import { json, readJson, withApi } from '@/lib/errors';
import { getSession } from '@/lib/session';
import { createGiftCard } from '@/lib/wallet/service';

export const dynamic = 'force-dynamic';

export const POST = withApi(async (req, _ctx, locale) => {
  const body = await readJson<unknown>(req);
  const session = await getSession();
  return json(await createGiftCard(body, session?.userId ?? null, locale), 201);
});
