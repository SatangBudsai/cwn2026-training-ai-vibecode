import { describe, expect, it } from 'vitest';
import { ConsentVersionOutdatedError, MemberNotFoundError } from '../errors';
import type { ConsentRecord, ConsentRepository, MemberRecord, MemberRepository } from '../repository';
import { createMemberService } from '../service';

function setup() {
  const members = new Map<string, MemberRecord>();
  const consents: ConsentRecord[] = [];
  let tick = 0;

  const memberRepo: MemberRepository = {
    create: async (input) => {
      const m: MemberRecord = { ...input, tier: 'basic' };
      members.set(m.id, m);
      return { ...m };
    },
    findById: async (id) => (members.has(id) ? { ...members.get(id)! } : null),
    update: async (id, data) => {
      const m = { ...members.get(id)!, ...data };
      members.set(id, m);
      return { ...m };
    },
  };
  const consentRepo: ConsentRepository = {
    add: async (input) => {
      const c: ConsentRecord = { ...input, acceptedAt: new Date(2026, 10, 3, 9, 0, tick++) };
      consents.push(c);
      return c;
    },
    latest: async (memberId, purpose) =>
      consents.filter((c) => c.memberId === memberId && c.purpose === purpose).at(-1) ?? null,
  };
  const service = createMemberService({ members: memberRepo, consents: consentRepo, currentConsentVersion: 'v2' });
  return { service, consents };
}

describe('member service', () => {
  it('สมัครสมาชิก = สร้างโปรไฟล์ + เก็บ consent พร้อมเวอร์ชัน', async () => {
    const { service, consents } = setup();
    const m = await service.createMember({ userId: 'u1', displayName: 'สมาชิกทดสอบ', consentVersion: 'v2' });
    expect(m).toMatchObject({ id: 'u1', tier: 'basic' });
    expect(consents).toEqual([expect.objectContaining({ memberId: 'u1', consentVersion: 'v2', purpose: 'membership' })]);
    expect(await service.hasCurrentConsent('u1', 'membership')).toBe(true);
    expect(await service.hasCurrentConsent('u1', 'marketing')).toBe(false);
  });

  it('ยินยอมเวอร์ชันเก่า → ปฏิเสธ', async () => {
    const { service } = setup();
    await expect(service.createMember({ userId: 'u1', displayName: 'x', consentVersion: 'v1' })).rejects.toBeInstanceOf(
      ConsentVersionOutdatedError,
    );
    await expect(service.recordConsent({ memberId: 'u1', consentVersion: 'v1', purpose: 'marketing' })).rejects.toBeInstanceOf(
      ConsentVersionOutdatedError,
    );
  });

  it('แก้โปรไฟล์ / เปลี่ยนระดับ / ไม่พบสมาชิก', async () => {
    const { service } = setup();
    await service.createMember({ userId: 'u1', displayName: 'เดิม', consentVersion: 'v2' });
    expect(await service.updateProfile('u1', { displayName: 'ใหม่' })).toMatchObject({ displayName: 'ใหม่' });
    expect(await service.changeTier('u1', 'gold')).toMatchObject({ tier: 'gold' });
    await expect(service.getProfile('nobody')).rejects.toBeInstanceOf(MemberNotFoundError);
    await expect(service.changeTier('nobody', 'gold')).rejects.toBeInstanceOf(MemberNotFoundError);
  });
});
