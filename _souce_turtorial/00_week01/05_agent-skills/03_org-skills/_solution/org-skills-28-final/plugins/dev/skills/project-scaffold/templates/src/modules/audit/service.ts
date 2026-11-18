import { ValidationError } from '@/lib/app-error';
import { AuditWriteFailedError } from './errors';
import type { AuditRepository } from './repository';
import { auditEntrySchema, SENSITIVE_KEYS, type AuditEntry } from './schema';

export interface AuditServiceDeps {
  repo: AuditRepository;
  onWriteFailed?: (err: unknown, entry: AuditEntry) => void;
}

export function stripSensitive(meta: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  return Object.fromEntries(Object.entries(meta).filter(([key]) => !SENSITIVE_KEYS.includes(key)));
}

export function createAuditService(deps: AuditServiceDeps) {
  return {
    /** บันทึกว่าใคร ทำอะไร กับอะไร เมื่อไร — ตัดข้อมูลอ่อนไหวออกจาก meta ก่อนเสมอ */
    async recordAudit(input: AuditEntry): Promise<void> {
      const parsed = auditEntrySchema.safeParse(input);
      if (!parsed.success) throw new ValidationError('ข้อมูล audit ไม่ถูกต้อง');
      const entry = { ...parsed.data, meta: stripSensitive(parsed.data.meta) };
      try {
        await deps.repo.insert(entry);
      } catch (err: unknown) {
        deps.onWriteFailed?.(err, entry);
        throw new AuditWriteFailedError();
      }
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;
