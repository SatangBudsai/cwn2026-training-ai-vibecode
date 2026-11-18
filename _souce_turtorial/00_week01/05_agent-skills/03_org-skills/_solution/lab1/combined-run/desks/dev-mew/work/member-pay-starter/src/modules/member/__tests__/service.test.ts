import { describe, expect, it } from "vitest";
import { ValidationFailedError } from "@/lib/app-error";
import { createAuditService, createInMemoryAuditRepository } from "@/modules/audit";
import { createInMemoryMemberRepository, createMemberService, MemberAlreadyExistsError, MemberNotFoundError } from "../index";

function setup() {
  const audit = createAuditService({ repo: createInMemoryAuditRepository() });
  const members = createMemberService({ repo: createInMemoryMemberRepository(), audit });
  return { members, audit };
}

describe("member service", () => {
  it("creates a basic-tier profile once per user", async () => {
    const { members } = setup();
    const profile = await members.createProfile({ userId: "u1", displayName: "  มิว  " });
    expect(profile).toMatchObject({ userId: "u1", displayName: "มิว", tier: "basic", consents: [] });
    await expect(members.createProfile({ userId: "u1", displayName: "x" })).rejects.toBeInstanceOf(MemberAlreadyExistsError);
    await expect(members.createProfile({ userId: "u2", displayName: "" })).rejects.toBeInstanceOf(ValidationFailedError);
  });

  it("updates the display name and validates input", async () => {
    const { members } = setup();
    await members.createProfile({ userId: "u1", displayName: "มิว" });
    expect((await members.updateProfile("u1", { displayName: "มิว อ." })).displayName).toBe("มิว อ.");
    await expect(members.updateProfile("u1", { displayName: "" })).rejects.toBeInstanceOf(ValidationFailedError);
    await expect(members.getProfile("nobody")).rejects.toBeInstanceOf(MemberNotFoundError);
  });

  it("stores each PDPA consent version once and audits it", async () => {
    const { members, audit } = setup();
    await members.createProfile({ userId: "u1", displayName: "มิว" });
    await members.acceptConsent("u1", "privacy-2026.1");
    await members.acceptConsent("u1", "privacy-2026.1");
    await members.acceptConsent("u1", "privacy-2026.2");
    const profile = await members.getProfile("u1");
    expect(profile.consents.map((c) => c.version)).toEqual(["privacy-2026.1", "privacy-2026.2"]);
    expect(await members.hasAcceptedConsent("u1", "privacy-2026.2")).toBe(true);
    expect(await members.hasAcceptedConsent("u1", "privacy-2027.1")).toBe(false);
    expect(await audit.listEntriesForTarget("member", "u1")).toHaveLength(2);
    await expect(members.acceptConsent("u1", "latest")).rejects.toBeInstanceOf(ValidationFailedError);
  });

  it("changes tier with an audit trail", async () => {
    const { members, audit } = setup();
    await members.createProfile({ userId: "u1", displayName: "มิว" });
    expect((await members.changeTier("admin-1", "u1", "gold")).tier).toBe("gold");
    const [entry] = await audit.listEntriesForTarget("member", "u1");
    expect(entry).toMatchObject({ actorId: "admin-1", meta: { from: "basic", to: "gold" } });
    await expect(members.changeTier("admin-1", "u1", "platinum" as "gold")).rejects.toBeInstanceOf(ValidationFailedError);
  });
});
