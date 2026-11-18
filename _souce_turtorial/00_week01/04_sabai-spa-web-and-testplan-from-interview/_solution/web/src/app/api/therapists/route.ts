import { listTherapists } from '@/lib/catalog';
import { json, withApi } from '@/lib/errors';
import type { ServiceId, TherapistsResponse } from '@/types';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req) => {
  const params = new URL(req.url).searchParams;
  const serviceId = (params.get('service') || undefined) as ServiceId | undefined;
  // สัญญาไม่มี error ของเส้นนี้ ค่าที่อ่านไม่ได้จึงถือว่าไม่ได้ส่ง
  const minRatingText = params.get('minRating');
  const minRating = minRatingText ? Number(minRatingText) : Number.NaN;
  return json<TherapistsResponse>({
    therapists: await listTherapists({
      serviceId,
      minRating: Number.isFinite(minRating) ? minRating : undefined,
    }),
  });
});
