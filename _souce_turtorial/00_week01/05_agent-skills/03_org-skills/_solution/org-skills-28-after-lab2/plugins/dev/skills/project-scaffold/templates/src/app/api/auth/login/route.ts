import { getAuditService } from '@/modules/audit';
import { getAuthService, loginInputSchema, refreshCookie } from '@/modules/auth';
import { ok, parseInput, readJson, route } from '@/lib/http';

export const POST = route('auth', async (req) => {
  const input = parseInput(loginInputSchema, await readJson(req));
  const tokens = await getAuthService().login(input);
  await getAuditService().recordAudit({ actorId: tokens.userId, action: 'auth.logged_in', target: `user:${tokens.userId}` });
  // refresh token อยู่ใน httpOnly cookie เท่านั้น ไม่ส่งใน body
  return ok(
    { accessToken: tokens.accessToken, accessExpiresAt: tokens.accessExpiresAt.toISOString() },
    200,
    { 'Set-Cookie': refreshCookie(tokens.refreshToken, tokens.refreshExpiresAt) },
  );
});
