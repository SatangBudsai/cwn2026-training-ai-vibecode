import { z } from "zod";

/** กติกาข้อ 9: access 15 นาที, refresh หมุนทุกครั้ง, client refresh ก่อนหมด 60 วินาที */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const CLIENT_REFRESH_LEEWAY_SECONDS = 60;
export const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

export const UserRoleSchema = z.enum(["member", "admin"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const RegisterInputSchema = z.object({
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10, "รหัสผ่านอย่างน้อย 10 ตัวอักษร").max(128),
});
export type RegisterInput = z.input<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.input<typeof LoginInputSchema>;

export const RefreshTokenSchema = z.string().min(20).max(256);

export const AccessTokenClaimsSchema = z.object({
  sub: z.string().min(1),
  role: UserRoleSchema,
  iat: z.number().int(),
  exp: z.number().int(),
});
export type AccessTokenClaims = z.infer<typeof AccessTokenClaimsSchema>;

export interface TokenPair {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}
