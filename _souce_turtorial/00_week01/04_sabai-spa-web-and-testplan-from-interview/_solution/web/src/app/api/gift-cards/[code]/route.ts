import { json, withApi } from '@/lib/errors';
import { getGiftCard } from '@/lib/wallet/service';

export const dynamic = 'force-dynamic';

export const GET = withApi<{ code: string }>(async (_req, ctx) => {
  const { code } = await ctx.params;
  return json(await getGiftCard(code));
});
