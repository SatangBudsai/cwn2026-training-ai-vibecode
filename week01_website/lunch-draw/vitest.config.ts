import { defineConfig } from "vitest/config";

// unit tests only; the Playwright suite in e2e/ runs with `npm run e2e`
export default defineConfig({ test: { include: ["src/**/*.test.ts"] } });
