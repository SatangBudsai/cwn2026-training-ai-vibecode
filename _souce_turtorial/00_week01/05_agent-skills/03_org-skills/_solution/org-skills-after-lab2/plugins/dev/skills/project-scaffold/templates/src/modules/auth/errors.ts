import { AppError } from '@/lib/app-error';

export class EmailTakenError extends AppError {
  constructor() {
    super('AUTH_EMAIL_TAKEN', 409, 'อีเมลนี้ถูกใช้สมัครแล้ว');
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('AUTH_INVALID_CREDENTIALS', 401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  }
}

export class InvalidRefreshTokenError extends AppError {
  constructor() {
    super('AUTH_REFRESH_INVALID', 401, 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  }
}

/** ใช้ refresh token เก่าซ้ำ = อาจถูกขโมย → เพิกถอนทั้งตระกูลแล้ว */
export class RefreshTokenReusedError extends AppError {
  constructor() {
    super('AUTH_REFRESH_REUSED', 401, 'เซสชันถูกยกเลิกเพื่อความปลอดภัย กรุณาเข้าสู่ระบบใหม่');
  }
}

export class AccessTokenInvalidError extends AppError {
  constructor() {
    super('AUTH_ACCESS_INVALID', 401, 'กรุณาเข้าสู่ระบบ');
  }
}
