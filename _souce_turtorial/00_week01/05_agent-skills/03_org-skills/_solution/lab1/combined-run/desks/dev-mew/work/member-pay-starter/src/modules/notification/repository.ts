import type { JobQueue } from "@/lib/queue";
import type { NotificationJob } from "./schema";

/** ที่เก็บของโมดูล notification = คิว (BullMQ ใน production) */
export type NotificationQueue = JobQueue<NotificationJob>;
