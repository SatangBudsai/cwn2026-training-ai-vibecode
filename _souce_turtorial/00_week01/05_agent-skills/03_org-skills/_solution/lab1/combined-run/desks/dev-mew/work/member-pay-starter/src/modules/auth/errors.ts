import { AppError } from "@/lib/app-error";

export class EmailTakenError extends AppError {
  readonly code = "AUTH_EMAIL_TAKEN";
  readonly httpStatus = 409;
  constructor() {
    super("อีเมลนี้ถูกใช้สมัครแล้ว");
  }
}

export class InvalidCredentialsError extends AppError {
  readonly code = "AUTH_INVALID_CREDENTIALS";
  readonly httpStatus = 401;
  constructor() {
    super("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }
}

export class InvalidTokenError extends AppError {
  readonly code = "AUTH_INVALID_TOKEN";
  readonly httpStatus = 401;
  constructor() {
    super("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }
}

export class RefreshTokenReusedError extends AppError {
  readonly code = "AUTH_REFRESH_REUSED";
  readonly httpStatus = 401;
  constructor() {
    super("ตรวจพบการใช้ token ซ้ำ ระบบออกจากระบบทุกอุปกรณ์เพื่อความปลอดภัย");
  }
}
