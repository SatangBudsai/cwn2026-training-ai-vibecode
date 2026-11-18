// worker แยก process: npm run worker
import { Worker, type Job } from 'bullmq';
import { moduleLogger } from '@/lib/logger';
import { getQueue, QUEUE_NAMES } from '@/lib/queue';
import { getRedis } from '@/lib/redis';
import { getAuditService } from '@/modules/audit';
import { getNotificationService, notificationJobSchema, renderTemplate } from '@/modules/notification';
import type { PaymentPaidEvent } from '@/modules/payment';

const log = moduleLogger('worker');

/** job ที่ล้มครบ 5 ครั้ง → dead-letter + log ระดับ error (ผูก alert ที่ log management) */
async function deadLetter(job: Job | undefined, err: Error): Promise<void> {
  if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;
  await getQueue(QUEUE_NAMES.deadLetter).add(QUEUE_NAMES.deadLetter, {
    queue: job.queueName,
    jobId: job.id,
    data: job.data as unknown,
    reason: err.message,
  });
  log.error({ queue: job.queueName, jobId: job.id, err }, 'job dead-lettered');
}

const paymentWorker = new Worker<PaymentPaidEvent>(
  QUEUE_NAMES.paymentPaid,
  async (job) => {
    const event = job.data;
    await getAuditService().recordAudit({ actorId: event.memberId, action: 'payment.paid', target: `order:${event.orderId}` });
    // TODO ตาม spec: เพิ่มแต้ม / เปิดสิทธิ์แพ็กเกจ — ต้อง idempotent (ใช้ event.eventId)
    await getNotificationService().requestNotification(
      { memberId: event.memberId, channel: 'line', template: 'payment.paid', params: { orderId: event.orderId } },
      `payment-paid-${event.eventId}`,
    );
  },
  { connection: getRedis() },
);

const notificationWorker = new Worker(
  QUEUE_NAMES.notificationRequested,
  async (job) => {
    const data = notificationJobSchema.parse(job.data);
    const text = renderTemplate(data.template, data.params);
    // TODO: ดึงช่องทางติดต่อจาก member แล้วส่งผ่าน provider จริง (email / SMS / LINE_CHANNEL_TOKEN)
    log.info({ channel: data.channel, template: data.template, length: text.length }, 'notification sent');
  },
  { connection: getRedis() },
);

for (const worker of [paymentWorker, notificationWorker]) {
  worker.on('failed', (job, err) => void deadLetter(job, err));
}

log.info('workers started');
