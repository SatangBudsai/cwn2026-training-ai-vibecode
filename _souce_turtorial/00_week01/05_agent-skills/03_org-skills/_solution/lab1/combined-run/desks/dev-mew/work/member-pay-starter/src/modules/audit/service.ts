import { systemClock, type Clock } from "@/lib/clock";
import { createId } from "@/lib/ids";
import { InvalidAuditEntryError } from "./errors";
import type { AuditEntryRecord, AuditRepository } from "./repository";
import { RecordActionInputSchema, type RecordActionInput } from "./schema";

export interface AuditServiceDeps {
  repo: AuditRepository;
  clock?: Clock;
}

export interface AuditService {
  recordAction(input: RecordActionInput): Promise<AuditEntryRecord>;
  listEntriesForTarget(targetType: string, targetId: string): Promise<AuditEntryRecord[]>;
}

export function createAuditService({ repo, clock = systemClock }: AuditServiceDeps): AuditService {
  return {
    async recordAction(input) {
      const parsed = RecordActionInputSchema.safeParse(input);
      if (!parsed.success) throw new InvalidAuditEntryError({ cause: parsed.error });
      const entry: AuditEntryRecord = { id: createId(), ...parsed.data, createdAt: clock() };
      await repo.insertEntry(entry);
      return entry;
    },
    async listEntriesForTarget(targetType, targetId) {
      return repo.listEntriesByTarget(targetType, targetId);
    },
  };
}
