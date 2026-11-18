import { z } from 'zod';

// coding-rules ข้อ 3 + 5: ความลับทุกตัวอ่านจาก env ผ่านไฟล์นี้ และตรวจด้วย Zod
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SEC: z.coerce.number().int().positive().default(900),
  THAIPAY_MERCHANT_ID: z.string().min(1),
  THAIPAY_WEBHOOK_SECRET: z.string().min(1),
  THAIPAY_GATEWAY_URL: z.string().url(),
  LINE_CHANNEL_TOKEN: z.string().min(1),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.parse(process.env);
  // coding-rules ข้อ 9: production ใช้ access token 15 นาทีเสมอ (ค่าอื่นใช้ได้เฉพาะ dev/test)
  if (parsed.NODE_ENV === 'production') parsed.ACCESS_TOKEN_TTL_SEC = 900;
  cached = parsed;
  return cached;
}
