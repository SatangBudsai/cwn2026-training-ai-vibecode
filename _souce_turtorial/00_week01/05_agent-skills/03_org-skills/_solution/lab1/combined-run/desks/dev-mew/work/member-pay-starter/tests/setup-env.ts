// ค่า env สำหรับ test เท่านั้น (ไม่ใช่ความลับจริง)
// ใช้ Object.assign เพราะ type ของ Next (next-env.d.ts) ทำให้ process.env.NODE_ENV เป็น readonly
Object.assign(process.env, {
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  APP_BASE_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: "test-access-secret-0123456789abcdef",
  JWT_REFRESH_SECRET: "test-refresh-secret-0123456789abcdef",
  JWT_ACCESS_TTL_SECONDS: "900",
  REFRESH_TOKEN_TTL_DAYS: "30",
  THAIPAY_MERCHANT_ID: "merchant-test",
  THAIPAY_WEBHOOK_SECRET: "test-webhook-secret-123",
  THAIPAY_GATEWAY_URL: "https://sandbox.thaipay.example/checkout",
  LINE_CHANNEL_TOKEN: "test-line-token",
});
