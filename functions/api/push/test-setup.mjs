import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";

await applyD1Migrations(env.PUSH_DB, env.TEST_MIGRATIONS);
await applyD1Migrations(env.FEEDBACK_DB, env.FEEDBACK_TEST_MIGRATIONS);
