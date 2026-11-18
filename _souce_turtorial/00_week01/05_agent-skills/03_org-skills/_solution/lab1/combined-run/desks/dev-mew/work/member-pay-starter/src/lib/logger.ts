import pino, { type Logger } from "pino";
import { getEnv } from "@/config/env";

/** log เป็น JSON ผ่าน pino เท่านั้น (กติกาข้อ 8) — ห้ามมี password/token/เลขบัตร/เบอร์เต็ม */
const REDACT_PATHS = [
  "password",
  "*.password",
  "token",
  "*.token",
  "accessToken",
  "*.accessToken",
  "refreshToken",
  "*.refreshToken",
  "nationalId",
  "*.nationalId",
  "phone",
  "*.phone",
  "headers.authorization",
  "headers.cookie",
];

let baseLogger: Logger | undefined;

function getBaseLogger(): Logger {
  baseLogger ??= pino({
    level: getEnv().LOG_LEVEL,
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    messageKey: "msg",
    formatters: { level: (label) => ({ level: label }) },
    redact: { paths: REDACT_PATHS, censor: "[REDACTED]" },
  });
  return baseLogger;
}

export function getLogger(module: string, requestId: string): Logger {
  return getBaseLogger().child({ module, requestId });
}
