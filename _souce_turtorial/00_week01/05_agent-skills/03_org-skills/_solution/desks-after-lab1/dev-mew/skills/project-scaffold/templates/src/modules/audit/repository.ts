import type { Prisma, PrismaClient } from '@prisma/client';
import type { AuditEntry } from './schema';

export interface AuditRepository {
  insert(entry: AuditEntry): Promise<void>;
}

export function createPrismaAuditRepository(db: PrismaClient): AuditRepository {
  return {
    async insert(entry) {
      await db.auditLog.create({
        data: { ...entry, meta: entry.meta as Prisma.InputJsonValue | undefined },
      });
    },
  };
}
