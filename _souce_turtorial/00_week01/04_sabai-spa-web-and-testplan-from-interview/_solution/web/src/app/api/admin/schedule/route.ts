import { getAdminSchedule } from '@/lib/admin/schedule';
import { json, withApi } from '@/lib/errors';
import { requireOwner } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req) => {
  await requireOwner();
  return json(await getAdminSchedule(req.nextUrl.searchParams.get('date')));
});
