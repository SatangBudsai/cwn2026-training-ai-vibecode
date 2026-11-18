import { getAuditService } from '@/modules/audit';
import { getAuthService, registerInputSchema } from '@/modules/auth';
import { getMemberService } from '@/modules/member';
import { ok, parseInput, readJson, route } from '@/lib/http';

export const POST = route('auth', async (req) => {
  const input = parseInput(registerInputSchema, await readJson(req));
  const { userId } = await getAuthService().register(input);
  await getMemberService().createMember({ userId, displayName: input.displayName, consentVersion: input.consentVersion });
  await getAuditService().recordAudit({ actorId: userId, action: 'auth.registered', target: `user:${userId}` });
  return ok({ userId }, 201);
});
