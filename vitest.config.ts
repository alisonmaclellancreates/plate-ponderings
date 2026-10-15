import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.{test,spec}.{ts,tsx}"],
    testTimeout: 20000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.d.ts",
        "**/*.gen.ts",
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/test/**",
        "src/integrations/supabase/types.ts",
      ],
      reporter: ["text", "html", "lcov", "json", "json-summary"],
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
