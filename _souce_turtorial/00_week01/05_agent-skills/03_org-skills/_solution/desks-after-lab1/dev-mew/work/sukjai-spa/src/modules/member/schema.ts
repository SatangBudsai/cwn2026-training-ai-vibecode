import { z } from 'zod';

export const MEMBER_TIERS = ['basic', 'silver', 'gold'] as const;
export type MemberTier = (typeof MEMBER_TIERS)[number];

/** เปลี่ยนเวอร์ชันทุกครั้งที่แก้ข้อความยินยอม (PDPA) — เก็บเวอร์ชันที่ผู้ใช้ยินยอมไว้ทุกครั้ง */
export const CURRENT_CONSENT_VERSION = '2026-11-v1';
export const CONSENT_PURPOSES = ['membership', 'marketing'] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export const updateProfileInputSchema = z.object({
  displayName: z.string().min(1).max(100),
});

export const consentInputSchema = z.object({
  consentVersion: z.string().min(1),
  purpose: z.enum(CONSENT_PURPOSES),
});
