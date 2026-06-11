import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.vitest.ts"],
    setupFiles: ["test/setup.ts"],
    testTimeout: 120_000,
    sequence: { concurrent: false },
  },
});
