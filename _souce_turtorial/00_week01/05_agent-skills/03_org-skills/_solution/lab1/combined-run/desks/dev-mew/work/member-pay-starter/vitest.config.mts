import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    coverage: {
      provider: "v8",
      include: ["src/modules/**/service.ts"],
      thresholds: { lines: 80 },
      reporter: ["text-summary", "text"],
    },
  },
});
