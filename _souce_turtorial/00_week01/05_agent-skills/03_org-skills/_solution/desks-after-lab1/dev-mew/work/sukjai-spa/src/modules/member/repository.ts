import type { PrismaClient } from '@prisma/client';
import type { ConsentPurpose, MemberTier } from './schema';

export interface MemberRecord {
  id: string;
  displayName: string;
  tier: MemberTier;
}

export interface ConsentRecord {
  memberId: string;
  consentVersion: string;
  purpose: ConsentPurpose;
  acceptedAt: Date;
}

export interface MemberRepository {
  create(input: { id: string; displayName: string }): Promise<MemberRecord>;
  findById(id: string): Promise<MemberRecord | null>;
  update(id: string, data: Partial<Pick<MemberRecord, 'displayName' | 'tier'>>): Promise<MemberRecord>;
}

export interface ConsentRepository {
  add(input: { memberId: string; consentVersion: string; purpose: ConsentPurpose }): Promise<ConsentRecord>;
  latest(memberId: string, purpose: ConsentPurpose): Promise<ConsentRecord | null>;
}

const toMember = (row: { id: string; displayName: string; tier: string }): MemberRecord => ({
  id: row.id,
  displayName: row.displayName,
  tier: row.tier as MemberTier,
});

const toConsent = (row: { memberId: string; consentVersion: string; purpose: string; acceptedAt: Date }): ConsentRecord => ({
  ...row,
  purpose: row.purpose as ConsentPurpose,
});

export function createPrismaMemberRepository(db: PrismaClient): MemberRepository {
  return {
    async create(input) {
      return toMember(await db.member.create({ data: input }));
    },
    async findById(id) {
      const row = await db.member.findUnique({ where: { id } });
      return row ? toMember(row) : null;
    },
    async update(id, data) {
      return toMember(await db.member.update({ where: { id }, data }));
    },
  };
}

export function createPrismaConsentRepository(db: PrismaClient): ConsentRepository {
  return {
    async add(input) {
      return toConsent(await db.consent.create({ data: input }));
    },
    async latest(memberId, purpose) {
      const row = await db.consent.findFirst({ where: { memberId, purpose }, orderBy: { acceptedAt: 'desc' } });
      return row ? toConsent(row) : null;
    },
  };
}
