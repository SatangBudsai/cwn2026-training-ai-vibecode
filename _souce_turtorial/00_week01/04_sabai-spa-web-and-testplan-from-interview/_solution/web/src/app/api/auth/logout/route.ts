import { json, withApi } from '@/lib/errors';
import { clearSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const POST = withApi(async () => {
  await clearSession();
  return json({ ok: true });
});
