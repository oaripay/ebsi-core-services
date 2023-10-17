import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/?(*.|*-)+(spec|test).ts"],
    environment: "node",
    threads: false,
    hookTimeout: 30_000,
    testTimeout: 60_000,
  },
  plugins: [
    swc.vite(), // This is required to build the test files with SWC
  ],
});
