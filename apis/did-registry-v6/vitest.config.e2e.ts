import type { Plugin } from "vite";

import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    swc.vite() as Plugin, // This is required to build the test files with SWC
  ],
  test: {
    alias: {
      // See https://github.com/vitest-dev/vitest/issues/4605
      graphql: "graphql/index.js",
    },
    environment: "node",
    fileParallelism: false,
    hookTimeout: 30_000,
    include: ["tests/**/?(*.|*-)+(spec|test).ts"],
    testTimeout: 30_000,
  },
});
