import { json, withApi } from '@/lib/errors';
import { requireUser } from '@/lib/session';
import { purchaseCourse } from '@/lib/wallet/service';

export const dynamic = 'force-dynamic';

export const POST = withApi(async () => {
  const session = await requireUser();
  return json(await purchaseCourse(session.userId), 201);
});
