import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/lib/app-error';
import { NotificationTemplateNotFoundError } from '../errors';
import type { NotificationJob } from '../schema';
import { createNotificationService, renderTemplate } from '../service';

function setup() {
  const jobs: { job: NotificationJob; dedupeKey?: string }[] = [];
  const service = createNotificationService({
    queue: {
      enqueue: async (job, dedupeKey) => {
        jobs.push({ job, dedupeKey });
      },
    },
  });
  return { service, jobs };
}

describe('notification service', () => {
  it('ใส่คิวพร้อม dedupeKey', async () => {
    const { service, jobs } = setup();
    await service.requestNotification(
      { memberId: 'm1', channel: 'line', template: 'payment.paid', params: { orderId: 'o1' } },
      'evt-1',
    );
    expect(jobs).toEqual([{ job: expect.objectContaining({ memberId: 'm1', channel: 'line' }), dedupeKey: 'evt-1' }]);
  });

  it('ช่องทาง/แม่แบบไม่ถูกต้อง → ไม่ใส่คิว', async () => {
    const { service, jobs } = setup();
    await expect(service.requestNotification({ memberId: 'm1', channel: 'fax', template: 'payment.paid' })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(service.requestNotification({ memberId: 'm1', channel: 'sms', template: 'nope' })).rejects.toBeInstanceOf(
      NotificationTemplateNotFoundError,
    );
    expect(jobs).toHaveLength(0);
  });

  it('render แม่แบบ', () => {
    expect(renderTemplate('payment.paid', { orderId: 'o1' })).toBe('ชำระเงินสำเร็จ คำสั่งซื้อ o1');
    expect(() => renderTemplate('nope', {})).toThrow(NotificationTemplateNotFoundError);
  });
});
