import { ok, route } from '@/lib/http';
import { clearRefreshCookie, getAuthService, readRefreshCookie } from '@/modules/auth';

export const POST = route('auth', async (req) => {
  const current = readRefreshCookie(req);
  if (current) await getAuthService().logout(current);
  return ok({ loggedOut: true }, 200, { 'Set-Cookie': clearRefreshCookie() });
});
