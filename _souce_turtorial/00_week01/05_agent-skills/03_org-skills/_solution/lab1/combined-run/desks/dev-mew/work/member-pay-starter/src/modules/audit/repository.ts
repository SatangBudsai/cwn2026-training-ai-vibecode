export interface AuditEntryRecord {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  meta: Record<string, unknown>;
  createdAt: Date;
}

export interface AuditRepository {
  insertEntry(entry: AuditEntryRecord): Promise<void>;
  listEntriesByTarget(targetType: string, targetId: string): Promise<AuditEntryRecord[]>;
}

export function createInMemoryAuditRepository(): AuditRepository {
  const entries: AuditEntryRecord[] = [];
  return {
    async insertEntry(entry) {
      entries.push(entry);
    },
    async listEntriesByTarget(targetType, targetId) {
      return entries.filter((e) => e.targetType === targetType && e.targetId === targetId);
    },
  };
}
