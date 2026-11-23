import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "server-only": new URL("./tests/server-only-shim.js", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.js"],
    setupFiles: ["./tests/setup.js"],
    // Financial/transaction tests share one in-memory replica set and must
    // not run two test files concurrently against it (sequence numbers and
    // balances would collide across files).
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
