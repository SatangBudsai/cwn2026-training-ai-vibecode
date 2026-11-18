import { getAvailability } from '@/lib/booking/availability';
import { json, withApi } from '@/lib/errors';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req) => {
  const params = new URL(req.url).searchParams;
  const session = await getSession();
  // OWNER ที่จองผ่านหน้าเว็บนับเป็นแขก
  const userId = session && session.role !== 'OWNER' ? session.userId : null;
  const result = await getAvailability(
    {
      service: params.get('service'),
      date: params.get('date'),
      party: params.get('party'),
      therapist: params.get('therapist'),
      course: params.get('course'),
    },
    userId,
  );
  return json(result);
});
