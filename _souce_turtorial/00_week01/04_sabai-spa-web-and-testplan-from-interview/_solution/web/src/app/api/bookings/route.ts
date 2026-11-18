import { createBooking } from '@/lib/booking/create';
import { json, readJson, withApi } from '@/lib/errors';
import { getSession } from '@/lib/session';
import type { CreateBookingRequest, CreateBookingResponse } from '@/types';

export const dynamic = 'force-dynamic';

export const POST = withApi(async (req) => {
  const body = await readJson<CreateBookingRequest>(req);
  const session = await getSession();
  // OWNER ที่จองผ่านหน้าเว็บนับเป็นแขก ต้องกรอกชื่อและเบอร์
  const userId = session && session.role !== 'OWNER' ? session.userId : null;
  const booking = await createBooking(body, { userId });
  return json<CreateBookingResponse>({ booking }, 201);
});
