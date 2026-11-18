import { AppError } from "@/lib/app-error";

export class InvalidNotificationError extends AppError {
  readonly code = "NOTIFICATION_INVALID";
  readonly httpStatus = 400;
  constructor(options?: { cause?: unknown }) {
    super("ข้อมูลการแจ้งเตือนไม่ถูกต้อง", options);
  }
}
