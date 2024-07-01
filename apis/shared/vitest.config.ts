import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/?(*.|*-)+(spec|test).ts"],
    environment: "node",
    fileParallelism: false,
    coverage: {
      reportsDirectory: "./coverage",
      reporter: ["text", "lcov"],
    },
  },
});
