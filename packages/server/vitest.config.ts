import path from "path";
import { defineConfig, } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts",],
    // Keep tests off the real database — clearAll() in tests would wipe it
    fileParallelism: false,
    env: {
      DATABASE_URL: "./data/test-db.sqlite",
      DATABASE_AUTH_TOKEN: "",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html",],
      exclude: ["node_modules/", "src/test/",],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src",),
    },
  },
},);
