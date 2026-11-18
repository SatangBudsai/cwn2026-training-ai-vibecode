import { InvalidNotificationError } from "./errors";
import type { NotificationQueue } from "./repository";
import { NOTIFICATION_QUEUE_NAME, NotificationJobSchema, type NotificationJobInput } from "./schema";

export interface NotificationService {
  enqueueNotification(input: NotificationJobInput): Promise<void>;
}

export function createNotificationService({ queue }: { queue: NotificationQueue }): NotificationService {
  return {
    async enqueueNotification(input) {
      const parsed = NotificationJobSchema.safeParse(input);
      if (!parsed.success) throw new InvalidNotificationError({ cause: parsed.error });
      await queue.add(NOTIFICATION_QUEUE_NAME, parsed.data);
    },
  };
}
