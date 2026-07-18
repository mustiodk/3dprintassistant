import path from "node:path";

import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(
        path.join(import.meta.dirname, "migrations"),
      );

      return {
        main: "./worker.js",
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          bindings: {
            IOS_PUSH_REGISTRATION_SECRET: "test-registration-secret",
            PUSH_TOKEN_ENCRYPTION_KEY_V1:
              "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            PUSH_REGISTRATION_ENABLED: "true",
            PUSH_TEST_RATE_LIMIT_BYPASS: "true",
            TEST_MIGRATIONS: migrations,
          },
          d1Databases: { PUSH_DB: "push-db" },
          queueProducers: {
            PUSH_FANOUT: "push-fanout",
            PUSH_DLQ: "push-dlq",
          },
          serviceBindings: {
            ASSETS: () => new Response("Not found", { status: 404 }),
          },
        },
      };
    }),
  ],
  test: {
    include: ["functions/api/push/**/*.test.mjs"],
    setupFiles: ["./functions/api/push/test-setup.mjs"],
  },
});
