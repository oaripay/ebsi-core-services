import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/?(*.|*-)+(spec|test).ts"],
    environment: "node",
    fileParallelism: false,
    outputFile: {
      "vitest-sonar-reporter": "./coverage/test-reporter.xml",
    },
    coverage: {
      reportsDirectory: "./coverage",
      reporter: ["text", "lcov"],
    },
  },
});
