import { ValidationFailedError } from "@/lib/app-error";
import { systemClock, type Clock } from "@/lib/clock";
import type { AuditRecorder } from "@/modules/audit";
import { MemberAlreadyExistsError, MemberNotFoundError } from "./errors";
import type { MemberProfileRecord, MemberRepository } from "./repository";
import {
  ConsentVersionSchema,
  CreateProfileInputSchema,
  MemberTierSchema,
  UpdateProfileInputSchema,
  type CreateProfileInput,
  type MemberTier,
  type UpdateProfileInput,
} from "./schema";

export interface MemberServiceDeps {
  repo: MemberRepository;
  clock?: Clock;
  audit?: AuditRecorder;
}

export interface MemberService {
  createProfile(input: CreateProfileInput): Promise<MemberProfileRecord>;
  getProfile(userId: string): Promise<MemberProfileRecord>;
  updateProfile(userId: string, input: UpdateProfileInput): Promise<MemberProfileRecord>;
  acceptConsent(userId: string, version: string): Promise<MemberProfileRecord>;
  hasAcceptedConsent(userId: string, version: string): Promise<boolean>;
  changeTier(actorId: string, userId: string, tier: MemberTier): Promise<MemberProfileRecord>;
}

export function createMemberService({ repo, clock = systemClock, audit }: MemberServiceDeps): MemberService {
  async function loadProfile(userId: string): Promise<MemberProfileRecord> {
    const profile = await repo.findProfileByUserId(userId);
    if (!profile) throw new MemberNotFoundError();
    return profile;
  }

  async function saveProfile(profile: MemberProfileRecord): Promise<MemberProfileRecord> {
    const updated = { ...profile, updatedAt: clock() };
    await repo.saveProfile(updated);
    return updated;
  }

  return {
    async createProfile(input) {
      const parsed = CreateProfileInputSchema.safeParse(input);
      if (!parsed.success) throw new ValidationFailedError(undefined, { cause: parsed.error });
      if (await repo.findProfileByUserId(parsed.data.userId)) throw new MemberAlreadyExistsError();
      const now = clock();
      const profile: MemberProfileRecord = { ...parsed.data, tier: "basic", consents: [], createdAt: now, updatedAt: now };
      await repo.saveProfile(profile);
      return profile;
    },

    getProfile: loadProfile,

    async updateProfile(userId, input) {
      const parsed = UpdateProfileInputSchema.safeParse(input);
      if (!parsed.success) throw new ValidationFailedError(undefined, { cause: parsed.error });
      const profile = await loadProfile(userId);
      return saveProfile({ ...profile, displayName: parsed.data.displayName });
    },

    async acceptConsent(userId, version) {
      const parsed = ConsentVersionSchema.safeParse(version);
      if (!parsed.success) throw new ValidationFailedError(undefined, { cause: parsed.error });
      const profile = await loadProfile(userId);
      if (profile.consents.some((c) => c.version === parsed.data)) return profile;
      const updated = await saveProfile({
        ...profile,
        consents: [...profile.consents, { version: parsed.data, acceptedAt: clock() }],
      });
      await audit?.recordAction({
        actorId: userId,
        action: "member.accept_consent",
        targetType: "member",
        targetId: userId,
        meta: { version: parsed.data },
      });
      return updated;
    },

    async hasAcceptedConsent(userId, version) {
      const profile = await loadProfile(userId);
      return profile.consents.some((c) => c.version === version);
    },

    async changeTier(actorId, userId, tier) {
      const parsed = MemberTierSchema.safeParse(tier);
      if (!parsed.success) throw new ValidationFailedError(undefined, { cause: parsed.error });
      const profile = await loadProfile(userId);
      const updated = await saveProfile({ ...profile, tier: parsed.data });
      await audit?.recordAction({
        actorId,
        action: "member.change_tier",
        targetType: "member",
        targetId: userId,
        meta: { from: profile.tier, to: parsed.data },
      });
      return updated;
    },
  };
}
