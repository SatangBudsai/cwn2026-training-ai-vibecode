import { AppError } from '@/lib/app-error';

export class AuditWriteFailedError extends AppError {
  constructor() {
    super('AUDIT_WRITE_FAILED', 500, 'บันทึกประวัติการทำรายการไม่สำเร็จ');
  }
}
