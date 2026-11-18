import { loginUser } from '@/lib/account/service';
import { json, readJson, withApi } from '@/lib/errors';
import type { AuthResponse } from '@/types';

export const dynamic = 'force-dynamic';

export const POST = withApi(async (req) => {
  const user = await loginUser(await readJson<unknown>(req));
  return json<AuthResponse>({ user });
});
