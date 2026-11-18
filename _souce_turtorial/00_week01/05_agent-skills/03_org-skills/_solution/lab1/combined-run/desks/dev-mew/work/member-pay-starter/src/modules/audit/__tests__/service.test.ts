import { describe, expect, it } from "vitest";
import { createAuditService, createInMemoryAuditRepository, InvalidAuditEntryError } from "../index";

describe("audit service", () => {
  it("records who did what and when", async () => {
    const at = new Date("2026-11-03T09:00:00Z");
    const audit = createAuditService({ repo: createInMemoryAuditRepository(), clock: () => at });
    await audit.recordAction({ actorId: "u1", action: "payment.refund", targetType: "order", targetId: "o1" });
    const entries = await audit.listEntriesForTarget("order", "o1");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ actorId: "u1", action: "payment.refund", createdAt: at, meta: {} });
  });

  it("rejects malformed action names", async () => {
    const audit = createAuditService({ repo: createInMemoryAuditRepository() });
    await expect(
      audit.recordAction({ actorId: "u1", action: "Refund!", targetType: "order", targetId: "o1" }),
    ).rejects.toBeInstanceOf(InvalidAuditEntryError);
  });
});
