import { Queue, type JobsOptions } from 'bullmq';
import { getRedis } from './redis';

// arch-standards ข้อ 3: retry exponential สูงสุด 5 ครั้ง, ล้มครบไป dead-letter + แจ้งเตือน
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: 1_000,
  removeOnFail: false,
};

// ชื่อคิว/event: <domain>.<event> อดีตกาล (arch-standards ข้อ 7)
export const QUEUE_NAMES = {
  notificationRequested: 'notification.requested',
  paymentPaid: 'payment.paid',
  deadLetter: 'system.dead-lettered',
} as const;

const queues = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: getRedis(), defaultJobOptions: DEFAULT_JOB_OPTIONS });
    queues.set(name, queue);
  }
  return queue;
}
