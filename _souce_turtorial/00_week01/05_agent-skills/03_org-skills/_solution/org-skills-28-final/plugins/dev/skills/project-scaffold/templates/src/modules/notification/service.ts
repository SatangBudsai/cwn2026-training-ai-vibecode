import { ValidationError } from '@/lib/app-error';
import { NotificationTemplateNotFoundError } from './errors';
import type { NotificationQueue } from './repository';
import { notificationJobSchema, TEMPLATES, type TemplateName } from './schema';

export interface NotificationServiceDeps {
  queue: NotificationQueue;
}

export function renderTemplate(template: string, params: Record<string, string>): string {
  if (!(template in TEMPLATES)) throw new NotificationTemplateNotFoundError(template);
  return TEMPLATES[template as TemplateName].replace(/\{(\w+)\}/g, (_, key: string) => params[key] ?? '');
}

export function createNotificationService(deps: NotificationServiceDeps) {
  return {
    /** ไม่ส่งทันที — ใส่คิวเสมอ (arch-standards ข้อ 3) · dedupeKey กันส่งซ้ำเมื่อ event เดิมเข้ามาอีก */
    async requestNotification(input: unknown, dedupeKey?: string): Promise<void> {
      const parsed = notificationJobSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError('คำขอแจ้งเตือนไม่ถูกต้อง');
      if (!(parsed.data.template in TEMPLATES)) throw new NotificationTemplateNotFoundError(parsed.data.template);
      await deps.queue.enqueue(parsed.data, dedupeKey);
    },
  };
}

export type NotificationService = ReturnType<typeof createNotificationService>;
