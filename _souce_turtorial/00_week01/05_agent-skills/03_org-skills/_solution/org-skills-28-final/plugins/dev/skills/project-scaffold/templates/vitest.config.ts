import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/modules/**/service.ts'],
      // coding-rules ข้อ 6: service.ts ครอบคลุม >= 80% ของบรรทัด
      thresholds: { lines: 80 },
    },
  },
});
