import { z } from "zod";

export const MemberTierSchema = z.enum(["basic", "silver", "gold"]);
export type MemberTier = z.infer<typeof MemberTierSchema>;

export const CreateProfileInputSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().trim().min(1).max(100),
});
export type CreateProfileInput = z.input<typeof CreateProfileInputSchema>;

export const UpdateProfileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
});
export type UpdateProfileInput = z.input<typeof UpdateProfileInputSchema>;

/** เวอร์ชันข้อความยินยอม PDPA เช่น "privacy-2026.1" — เก็บทุกเวอร์ชันที่ผู้ใช้ยอมรับ */
export const ConsentVersionSchema = z.string().regex(/^[a-z]+-\d{4}\.\d+$/);
