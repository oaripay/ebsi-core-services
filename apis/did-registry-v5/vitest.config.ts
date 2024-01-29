import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/?(*.|*-)+(spec|test).ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    outputFile: {
      "vitest-sonar-reporter": "./coverage/test-reporter.xml",
    },
    coverage: {
      reportsDirectory: "./coverage",
      reporter: ["text", "lcov"],
    },
    globalSetup: "./tests/globalSetup.unit.ts",
  },
  plugins: [
    swc.vite(), // This is required to build the test files with SWC
  ],
});
