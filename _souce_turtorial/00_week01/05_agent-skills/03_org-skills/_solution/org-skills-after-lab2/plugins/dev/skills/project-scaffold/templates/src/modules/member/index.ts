// public interface ของโมดูล member (coding-rules ข้อ 1)
import { prisma } from '@/lib/db';
import { createPrismaConsentRepository, createPrismaMemberRepository } from './repository';
import { CURRENT_CONSENT_VERSION } from './schema';
import { createMemberService, type MemberService } from './service';

export * from './errors';
export {
  consentInputSchema,
  CURRENT_CONSENT_VERSION,
  MEMBER_TIERS,
  updateProfileInputSchema,
  type MemberTier,
} from './schema';

let service: MemberService | undefined;

export function getMemberService(): MemberService {
  service ??= createMemberService({
    members: createPrismaMemberRepository(prisma),
    consents: createPrismaConsentRepository(prisma),
    currentConsentVersion: CURRENT_CONSENT_VERSION,
  });
  return service;
}
