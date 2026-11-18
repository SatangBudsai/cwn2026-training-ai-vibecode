import { describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@/lib/app-error';
import { AuditWriteFailedError } from '../errors';
import type { AuditEntry } from '../schema';
import { createAuditService } from '../service';

describe('audit service', () => {
  it('บันทึก action และตัดข้อมูลอ่อนไหวออกจาก meta', async () => {
    const rows: AuditEntry[] = [];
    const service = createAuditService({ repo: { insert: async (e) => void rows.push(e) } });
    await service.recordAudit({
      actorId: 'u1',
      action: 'auth.logged_in',
      target: 'user:u1',
      meta: { ip: '10.0.0.1', password: 'x', refreshToken: 'y' },
    });
    expect(rows).toEqual([{ actorId: 'u1', action: 'auth.logged_in', target: 'user:u1', meta: { ip: '10.0.0.1' } }]);
  });

  it('action ไม่อยู่ในรายการ → ValidationError', async () => {
    const service = createAuditService({ repo: { insert: async () => undefined } });
    await expect(
      service.recordAudit({ actorId: null, action: 'unknown' as AuditEntry['action'], target: 'x' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('เขียนไม่สำเร็จ → แจ้ง onWriteFailed แล้วโยน error ที่มี type (ไม่เงียบ)', async () => {
    const onWriteFailed = vi.fn();
    const service = createAuditService({
      repo: {
        insert: async () => {
          throw new Error('db down');
        },
      },
      onWriteFailed,
    });
    await expect(service.recordAudit({ actorId: null, action: 'payment.paid', target: 'order:1' })).rejects.toBeInstanceOf(
      AuditWriteFailedError,
    );
    expect(onWriteFailed).toHaveBeenCalledOnce();
  });
});
