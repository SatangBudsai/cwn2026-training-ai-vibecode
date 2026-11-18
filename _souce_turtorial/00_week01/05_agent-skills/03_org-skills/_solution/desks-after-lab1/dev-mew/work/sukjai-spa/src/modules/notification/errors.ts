import { AppError } from '@/lib/app-error';

export class NotificationTemplateNotFoundError extends AppError {
  constructor(template: string) {
    super('NOTIFICATION_TEMPLATE_NOT_FOUND', 422, `ไม่พบแม่แบบข้อความ ${template}`);
  }
}
