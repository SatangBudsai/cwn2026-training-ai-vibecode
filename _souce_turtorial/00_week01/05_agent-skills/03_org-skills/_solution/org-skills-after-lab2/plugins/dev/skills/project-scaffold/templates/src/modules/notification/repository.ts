import { getQueue, QUEUE_NAMES } from '@/lib/queue';
import type { NotificationJob } from './schema';

/** "ที่เก็บ" ของโมดูลนี้คือคิว BullMQ */
export interface NotificationQueue {
  enqueue(job: NotificationJob, dedupeKey?: string): Promise<void>;
}

export function createBullNotificationQueue(): NotificationQueue {
  return {
    async enqueue(job, dedupeKey) {
      await getQueue(QUEUE_NAMES.notificationRequested).add(QUEUE_NAMES.notificationRequested, job, {
        jobId: dedupeKey,
      });
    },
  };
}
