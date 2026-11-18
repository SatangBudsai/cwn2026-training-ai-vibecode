// public interface ของโมดูล notification (coding-rules ข้อ 1)
import { createBullNotificationQueue } from './repository';
import { createNotificationService, type NotificationService } from './service';

export * from './errors';
export { CHANNELS, notificationJobSchema, TEMPLATES, type Channel, type NotificationJob } from './schema';
export { renderTemplate } from './service';

let service: NotificationService | undefined;

export function getNotificationService(): NotificationService {
  service ??= createNotificationService({ queue: createBullNotificationQueue() });
  return service;
}
