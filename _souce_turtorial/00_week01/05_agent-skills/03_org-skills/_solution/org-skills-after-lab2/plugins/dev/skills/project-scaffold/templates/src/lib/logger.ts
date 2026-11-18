import pino from 'pino';

// coding-rules ข้อ 8: log JSON ผ่านไฟล์นี้เท่านั้น ห้าม log รหัสผ่าน/token/เลขบัตร/เบอร์เต็ม
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'password',
      '*.password',
      'token',
      '*.token',
      'accessToken',
      '*.accessToken',
      'refreshToken',
      '*.refreshToken',
      'nationalId',
      '*.nationalId',
      'phone',
      '*.phone',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
});

/** ทุกบรรทัดมี module + requestId (coding-rules ข้อ 8) */
export function moduleLogger(module: string, requestId?: string) {
  return logger.child({ module, requestId });
}
