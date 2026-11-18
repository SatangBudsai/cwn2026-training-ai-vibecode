/** ฐานของ error ทุกตัวในระบบ (กติกาข้อ 4): มี code, httpStatus, message ที่แปลแล้ว */
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ValidationFailedError extends AppError {
  readonly code = "VALIDATION_FAILED";
  readonly httpStatus = 400;
  constructor(message = "ข้อมูลที่ส่งมาไม่ถูกต้อง", options?: { cause?: unknown }) {
    super(message, options);
  }
}

export class UnauthorizedError extends AppError {
  readonly code = "UNAUTHORIZED";
  readonly httpStatus = 401;
  constructor(message = "กรุณาเข้าสู่ระบบ") {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly code = "FORBIDDEN";
  readonly httpStatus = 403;
  constructor(message = "ไม่มีสิทธิ์ทำรายการนี้") {
    super(message);
  }
}
