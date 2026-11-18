import { z } from 'zod';

export const registerInputSchema = z.object({
  email: z.string().email().max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(10).max(128),
  displayName: z.string().min(1).max(100),
  consentVersion: z.string().min(1),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const ROLES = ['member', 'staff', 'admin'] as const;
export type Role = (typeof ROLES)[number];
