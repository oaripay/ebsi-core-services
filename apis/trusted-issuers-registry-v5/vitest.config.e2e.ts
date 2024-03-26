import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/?(*.|*-)+(spec|test).ts"],
    environment: "node",
    fileParallelism: false,
    hookTimeout: 120_000,
    testTimeout: 120_000,
  },
  plugins: [
    swc.vite(), // This is required to build the test files with SWC
  ],
});
