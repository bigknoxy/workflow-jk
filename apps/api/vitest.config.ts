import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@workflow-jk/adapters": path.resolve(__dirname, "../../packages/adapters/src"),
      "@workflow-jk/application": path.resolve(__dirname, "../../packages/application/src"),
      "@workflow-jk/domain": path.resolve(__dirname, "../../packages/domain/src"),
      "@workflow-jk/contracts": path.resolve(__dirname, "../../packages/contracts/src"),
      "@workflow-jk/observability": path.resolve(__dirname, "../../packages/observability/src"),
      "@workflow-jk/orchestration": path.resolve(__dirname, "../../packages/orchestration/src"),
    },
  },
});