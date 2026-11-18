import { json, withApi } from '@/lib/errors';
import { requireUser } from '@/lib/session';
import { getWallet } from '@/lib/wallet/service';

export const dynamic = 'force-dynamic';

export const GET = withApi(async () => {
  const session = await requireUser();
  return json(await getWallet(session.userId));
});
