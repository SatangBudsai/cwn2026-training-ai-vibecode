// coding-rules ข้อ 4: error ทุกตัว extend AppError (code, httpStatus, message ที่แปลแล้ว)
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'ข้อมูลไม่ถูกต้อง') {
    super('VALIDATION_FAILED', 400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'กรุณาเข้าสู่ระบบ') {
    super('AUTH_UNAUTHORIZED', 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'ไม่มีสิทธิ์ทำรายการนี้') {
    super('AUTH_FORBIDDEN', 403, message);
  }
}
