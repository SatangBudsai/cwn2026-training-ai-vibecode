import { json, withApi } from '@/lib/errors';
import { assertTestMode, parseOptionalBody, resetTestData } from '@/lib/test-tools';
import type { TestOkResponse } from '@/types';

export const dynamic = 'force-dynamic';

export const POST = withApi(async (req) => {
  assertTestMode();
  const body = parseOptionalBody(await req.text());
  return json<TestOkResponse>(await resetTestData(body.now));
});
