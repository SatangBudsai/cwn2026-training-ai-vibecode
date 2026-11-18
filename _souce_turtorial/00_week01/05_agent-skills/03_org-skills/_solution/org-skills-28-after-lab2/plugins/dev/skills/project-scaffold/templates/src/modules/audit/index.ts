// public interface ของโมดูล audit (coding-rules ข้อ 1)
import { prisma } from '@/lib/db';
import { moduleLogger } from '@/lib/logger';
import { createPrismaAuditRepository } from './repository';
import { createAuditService, type AuditService } from './service';

export * from './errors';
export { AUDIT_ACTIONS, type AuditAction, type AuditEntry } from './schema';

let service: AuditService | undefined;

export function getAuditService(): AuditService {
  service ??= createAuditService({
    repo: createPrismaAuditRepository(prisma),
    onWriteFailed: (err, entry) => moduleLogger('audit').error({ err, action: entry.action }, 'audit write failed'),
  });
  return service;
}
