import { describe, expect, it } from "vitest";
import { InMemoryJobQueue } from "@/lib/queue";
import { createNotificationService, InvalidNotificationError, type NotificationJob } from "../index";

describe("notification service", () => {
  it("puts a validated job on the queue", async () => {
    const queue = new InMemoryJobQueue<NotificationJob>();
    const service = createNotificationService({ queue });
    await service.enqueueNotification({ channel: "line", recipientUserId: "u1", template: "payment-succeeded" });
    expect(queue.jobs).toHaveLength(1);
    expect(queue.jobs[0]?.data).toEqual({ channel: "line", recipientUserId: "u1", template: "payment-succeeded", data: {} });
  });

  it("rejects unknown channels", async () => {
    const service = createNotificationService({ queue: new InMemoryJobQueue<NotificationJob>() });
    await expect(
      service.enqueueNotification({ channel: "fax" as "sms", recipientUserId: "u1", template: "welcome" }),
    ).rejects.toBeInstanceOf(InvalidNotificationError);
  });
});
