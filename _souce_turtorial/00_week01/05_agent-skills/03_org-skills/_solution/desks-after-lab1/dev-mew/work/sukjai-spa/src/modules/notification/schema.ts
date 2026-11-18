import { z } from 'zod';

export const CHANNELS = ['email', 'sms', 'line'] as const;
export type Channel = (typeof CHANNELS)[number];

/** แม่แบบข้อความ — เพิ่มตาม spec ของโปรเจกต์ */
export const TEMPLATES = {
  'payment.paid': 'ชำระเงินสำเร็จ คำสั่งซื้อ {orderId}',
  'member.welcome': 'ยินดีต้อนรับสู่ SukJai Spa Member',
} as const;
export type TemplateName = keyof typeof TEMPLATES;

/** ส่งแค่ memberId — worker ไปดึงช่องทางติดต่อเอง ไม่ใส่อีเมล/เบอร์ลงคิว (ลดข้อมูลส่วนบุคคลใน Redis) */
export const notificationJobSchema = z.object({
  memberId: z.string().min(1),
  channel: z.enum(CHANNELS),
  template: z.string().min(1),
  params: z.record(z.string()).default({}),
});
export type NotificationJob = z.infer<typeof notificationJobSchema>;
