import type { MemberTier } from "./schema";

export interface ConsentRecord {
  version: string;
  acceptedAt: Date;
}

export interface MemberProfileRecord {
  userId: string;
  displayName: string;
  tier: MemberTier;
  consents: ConsentRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberRepository {
  findProfileByUserId(userId: string): Promise<MemberProfileRecord | null>;
  saveProfile(profile: MemberProfileRecord): Promise<void>;
}

export function createInMemoryMemberRepository(): MemberRepository {
  const profiles = new Map<string, MemberProfileRecord>();
  return {
    async findProfileByUserId(userId) {
      const found = profiles.get(userId);
      return found ? { ...found, consents: [...found.consents] } : null;
    },
    async saveProfile(profile) {
      profiles.set(profile.userId, { ...profile, consents: [...profile.consents] });
    },
  };
}
