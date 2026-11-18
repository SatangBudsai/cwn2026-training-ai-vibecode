import { z } from "zod";

/** ตรวจ environment variable ทุกตัวด้วย Zod (กติกาข้อ 3, 5) — อ่าน env ผ่านไฟล์นี้เท่านั้น */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  APP_BASE_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  THAIPAY_MERCHANT_ID: z.string().min(1),
  THAIPAY_WEBHOOK_SECRET: z.string().min(16),
  THAIPAY_GATEWAY_URL: z.url(),
  LINE_CHANNEL_TOKEN: z.string().min(1),
});

export type Env = z.infer<typeof EnvSchema>;

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  cachedEnv ??= EnvSchema.parse(process.env);
  return cachedEnv;
}

export function resetEnvCache(): void {
  cachedEnv = undefined;
}
