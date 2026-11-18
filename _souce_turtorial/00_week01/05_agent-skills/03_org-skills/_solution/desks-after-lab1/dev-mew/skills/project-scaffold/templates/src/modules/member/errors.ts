import { AppError } from '@/lib/app-error';

export class MemberNotFoundError extends AppError {
  constructor() {
    super('MEMBER_NOT_FOUND', 404, 'ไม่พบข้อมูลสมาชิก');
  }
}

/** ผู้ใช้ยินยอมข้อความเวอร์ชันเก่า → ต้องให้อ่านและยินยอมเวอร์ชันปัจจุบัน */
export class ConsentVersionOutdatedError extends AppError {
  constructor() {
    super('MEMBER_CONSENT_OUTDATED', 409, 'ข้อความยินยอมมีการปรับปรุง กรุณาอ่านและยืนยันอีกครั้ง');
  }
}
