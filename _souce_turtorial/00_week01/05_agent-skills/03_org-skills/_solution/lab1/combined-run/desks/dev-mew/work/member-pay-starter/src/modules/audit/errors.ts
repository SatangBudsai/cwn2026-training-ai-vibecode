import { AppError } from "@/lib/app-error";

export class InvalidAuditEntryError extends AppError {
  readonly code = "AUDIT_INVALID_ENTRY";
  readonly httpStatus = 400;
  constructor(options?: { cause?: unknown }) {
    super("ข้อมูลบันทึกการใช้งานไม่ถูกต้อง", options);
  }
}
