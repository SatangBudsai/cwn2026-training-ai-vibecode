import { z } from 'zod';

/** action มาตรฐาน: <domain>.<event> อดีตกาล */
export const AUDIT_ACTIONS = [
  'auth.registered',
  'auth.logged_in',
  'auth.logged_out',
  'auth.refresh_reused',
  'member.profile_updated',
  'member.consent_given',
  'payment.checkout_created',
  'payment.paid',
  'payment.refunded',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const auditEntrySchema = z.object({
  actorId: z.string().nullable(),
  action: z.enum(AUDIT_ACTIONS),
  target: z.string().min(1),
  meta: z.record(z.unknown()).optional(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

/** key ที่ห้ามลง audit (PDPA / coding-rules ข้อ 8) */
export const SENSITIVE_KEYS = ['password', 'token', 'accessToken', 'refreshToken', 'nationalId', 'phone', 'cardNumber'];
