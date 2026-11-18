import { z } from "zod";

export const NOTIFICATION_QUEUE_NAME = "notifications";

export const NotificationJobSchema = z.object({
  channel: z.enum(["email", "sms", "line"]),
  recipientUserId: z.string().min(1),
  template: z.enum(["payment-succeeded", "payment-refunded", "welcome"]),
  data: z.record(z.string(), z.string()).default({}),
});

export type NotificationJob = z.infer<typeof NotificationJobSchema>;
export type NotificationJobInput = z.input<typeof NotificationJobSchema>;
