import { getService } from '@/lib/catalog';
import { ApiError, json, readJson, withApi } from '@/lib/errors';
import { recommendForMood } from '@/lib/rules/mood';
import type { MoodResponse } from '@/types';

export const dynamic = 'force-dynamic';

export const POST = withApi(async (req) => {
  const body = await readJson<{ mood?: unknown } | null>(req);
  const recommendation = recommendForMood(body?.mood);
  if (!recommendation) throw new ApiError('mood-invalid');
  const service = await getService(recommendation.serviceId);
  if (!service) throw new ApiError('service-not-found');
  return json<MoodResponse>({ ...recommendation, service });
});
