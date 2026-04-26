import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@workflow-jk/adapters": path.resolve(__dirname, "../adapters/src"),
      "@workflow-jk/contracts": path.resolve(__dirname, "../contracts/src"),
      "@workflow-jk/domain": path.resolve(__dirname, "../domain/src"),
      "@workflow-jk/testing": path.resolve(__dirname, "../testing/src"),
    },
  },
});