import { AppError } from '@/lib/app-error';

export class OrderNotFoundError extends AppError {
  constructor() {
    super('PAYMENT_ORDER_NOT_FOUND', 404, 'ไม่พบคำสั่งซื้อ');
  }
}

export class PackageNotFoundError extends AppError {
  constructor() {
    super('PAYMENT_PACKAGE_NOT_FOUND', 404, 'ไม่พบแพ็กเกจที่เลือก');
  }
}

export class InvalidWebhookSignatureError extends AppError {
  constructor() {
    super('PAYMENT_WEBHOOK_SIGNATURE_INVALID', 401, 'ลายเซ็นไม่ถูกต้อง');
  }
}

export class AmountMismatchError extends AppError {
  constructor() {
    super('PAYMENT_AMOUNT_MISMATCH', 422, 'ยอดชำระไม่ตรงกับคำสั่งซื้อ');
  }
}

/** สถานะ order เดินทางเดียว pending → paid → refunded ห้ามถอย */
export class InvalidOrderTransitionError extends AppError {
  constructor(from: string, to: string) {
    super('PAYMENT_INVALID_TRANSITION', 409, `เปลี่ยนสถานะคำสั่งซื้อจาก ${from} เป็น ${to} ไม่ได้`);
  }
}
