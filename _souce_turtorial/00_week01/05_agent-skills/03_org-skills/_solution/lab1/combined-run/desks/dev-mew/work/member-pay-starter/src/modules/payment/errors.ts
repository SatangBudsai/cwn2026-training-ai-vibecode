import { AppError } from "@/lib/app-error";

export class OrderNotFoundError extends AppError {
  readonly code = "PAYMENT_ORDER_NOT_FOUND";
  readonly httpStatus = 404;
  constructor() {
    super("ไม่พบคำสั่งซื้อ");
  }
}

export class OrderNotOwnedError extends AppError {
  readonly code = "PAYMENT_ORDER_NOT_OWNED";
  readonly httpStatus = 403;
  constructor() {
    super("คำสั่งซื้อนี้ไม่ใช่ของคุณ");
  }
}

export class InvalidOrderTransitionError extends AppError {
  readonly code = "PAYMENT_INVALID_TRANSITION";
  readonly httpStatus = 409;
  constructor(from: string, to: string) {
    super("เปลี่ยนสถานะคำสั่งซื้อจาก " + from + " เป็น " + to + " ไม่ได้");
  }
}

export class InvalidWebhookSignatureError extends AppError {
  readonly code = "PAYMENT_INVALID_SIGNATURE";
  readonly httpStatus = 401;
  constructor() {
    super("ลายเซ็น webhook ไม่ถูกต้อง");
  }
}

export class InvalidWebhookPayloadError extends AppError {
  readonly code = "PAYMENT_INVALID_WEBHOOK";
  readonly httpStatus = 400;
  constructor(options?: { cause?: unknown }) {
    super("ข้อมูล webhook ไม่ถูกต้อง", options);
  }
}

export class PaymentAmountMismatchError extends AppError {
  readonly code = "PAYMENT_AMOUNT_MISMATCH";
  readonly httpStatus = 422;
  constructor() {
    super("ยอดชำระไม่ตรงกับคำสั่งซื้อ");
  }
}
