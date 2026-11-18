import { AppError, UnauthorizedError } from '@/lib/app-error';
import { fail, ok, route } from '@/lib/http';
import { getAuditService } from '@/modules/audit';
import { clearRefreshCookie, getAuthService, readRefreshCookie, RefreshTokenReusedError, refreshCookie } from '@/modules/auth';

export const POST = route('auth', async (req) => {
  const current = readRefreshCookie(req);
  if (!current) throw new UnauthorizedError();
  try {
    const tokens = await getAuthService().refresh(current);
    return ok(
      { accessToken: tokens.accessToken, accessExpiresAt: tokens.accessExpiresAt.toISOString() },
      200,
      { 'Set-Cookie': refreshCookie(tokens.refreshToken, tokens.refreshExpiresAt) },
    );
  } catch (err: unknown) {
    if (!(err instanceof AppError)) throw err;
    if (err instanceof RefreshTokenReusedError) {
      await getAuditService().recordAudit({ actorId: null, action: 'auth.refresh_reused', target: 'refresh-token-family' });
    }
    // refresh ไม่ผ่าน → ล้าง cookie ให้ client ไป login ใหม่
    const res = fail(err.code, err.message, err.httpStatus);
    res.headers.set('Set-Cookie', clearRefreshCookie());
    return res;
  }
});
