import { ConsentVersionOutdatedError, MemberNotFoundError } from './errors';
import type { ConsentRepository, MemberRecord, MemberRepository } from './repository';
import type { ConsentPurpose, MemberTier } from './schema';

export interface MemberServiceDeps {
  members: MemberRepository;
  consents: ConsentRepository;
  currentConsentVersion: string;
}

export function createMemberService(deps: MemberServiceDeps) {
  async function getProfile(memberId: string): Promise<MemberRecord> {
    const member = await deps.members.findById(memberId);
    if (!member) throw new MemberNotFoundError();
    return member;
  }

  async function recordConsent(input: { memberId: string; consentVersion: string; purpose: ConsentPurpose }) {
    // รับเฉพาะเวอร์ชันปัจจุบัน — กันหน้าเว็บเก่าที่แสดงข้อความเวอร์ชันเดิม
    if (input.consentVersion !== deps.currentConsentVersion) throw new ConsentVersionOutdatedError();
    return deps.consents.add(input);
  }

  return {
    getProfile,
    recordConsent,

    /** สมัครสมาชิก: สร้างโปรไฟล์ + บันทึก consent การเป็นสมาชิกพร้อมเวอร์ชัน */
    async createMember(input: { userId: string; displayName: string; consentVersion: string }) {
      if (input.consentVersion !== deps.currentConsentVersion) throw new ConsentVersionOutdatedError();
      const member = await deps.members.create({ id: input.userId, displayName: input.displayName });
      await recordConsent({ memberId: member.id, consentVersion: input.consentVersion, purpose: 'membership' });
      return member;
    },

    async updateProfile(memberId: string, input: { displayName: string }): Promise<MemberRecord> {
      await getProfile(memberId);
      return deps.members.update(memberId, { displayName: input.displayName });
    },

    async changeTier(memberId: string, tier: MemberTier): Promise<MemberRecord> {
      await getProfile(memberId);
      return deps.members.update(memberId, { tier });
    },

    /** ยินยอมเวอร์ชันปัจจุบันแล้วหรือยัง (ถ้ายัง หน้าเว็บต้องให้ยืนยันใหม่) */
    async hasCurrentConsent(memberId: string, purpose: ConsentPurpose): Promise<boolean> {
      const latest = await deps.consents.latest(memberId, purpose);
      return latest?.consentVersion === deps.currentConsentVersion;
    },
  };
}

export type MemberService = ReturnType<typeof createMemberService>;
