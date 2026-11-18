import { AppError } from "@/lib/app-error";

export class MemberNotFoundError extends AppError {
  readonly code = "MEMBER_NOT_FOUND";
  readonly httpStatus = 404;
  constructor() {
    super("ไม่พบข้อมูลสมาชิก");
  }
}

export class MemberAlreadyExistsError extends AppError {
  readonly code = "MEMBER_ALREADY_EXISTS";
  readonly httpStatus = 409;
  constructor() {
    super("มีโปรไฟล์สมาชิกอยู่แล้ว");
  }
}
