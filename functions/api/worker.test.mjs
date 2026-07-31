import assert from "node:assert/strict";
import test from "node:test";

import worker, * as workerModule from "../../worker.js";

function makeHarness() {
  const requests = [];
  const env = {
    ASSETS: {
      async fetch(request) {
        requests.push(request);
        return new Response("asset", { status: 200 });
      },
    },
  };
  const ctx = { waitUntil() {} };
  return { env, ctx, requests };
}

const privatePaths = [
  "/wrangler.toml",
  "/wrangler.toml/",
  "/%77rangler.toml",
  "/worker.js",
  "/worker.js/",
  "/%77orker.js",
  "/functions/api/feedback.js",
  "/functions/api/feedback.js/",
  "/%66unctions/api/feedback.js",
  "/functions//api/feedback.js",
  "/migrations/0001_push.sql",
  "/migrations/0001_push.sql/",
  "/%6digrations/0001_push.sql",
  "/feedback-migrations/0001_feedback_reports.sql",
  "/%66eedback-migrations/0001_feedback_reports.sql",
];

test("exports the private-asset classifier", () => {
  assert.equal(typeof workerModule.isPrivateAssetPath, "function");
});

test("private source and configuration paths return 404 before ASSETS", async () => {
  for (const path of privatePaths) {
    const { env, ctx, requests } = makeHarness();
    const response = await worker.fetch(
      new Request(`https://3dprintassistant.com${path}`),
      env,
      ctx,
    );

    assert.equal(response.status, 404, path);
    assert.equal(requests.length, 0, `${path} reached ASSETS`);
  }
});

test("public app assets still delegate to ASSETS", async () => {
  for (const path of ["/", "/app.js", "/engine.js", "/data/printers.json"]) {
    const { env, ctx, requests } = makeHarness();
    const response = await worker.fetch(
      new Request(`https://3dprintassistant.com${path}`),
      env,
      ctx,
    );

    assert.equal(response.status, 200, path);
    assert.equal(requests.length, 1, `${path} did not reach ASSETS exactly once`);
  }
});

test("feedback admin route never reaches ASSETS", async () => {
  const { env, ctx, requests } = makeHarness();
  env.ANALYTICS_ADMIN_TOKEN = "owner";
  const response = await worker.fetch(new Request("https://3dprintassistant.com/api/feedback-admin", {
    method: "POST", headers: { Origin: "https://3dprintassistant.com", "Content-Type": "application/json" }, body: JSON.stringify({ action: "list" }),
  }), env, ctx);
  assert.equal(response.status, 401);
  assert.equal(requests.length, 0);
});

test("scheduled retention tracks push and feedback cleanup in one promise", async () => {
  let tracked;
  const env = {
    PUSH_DB: {
      prepare() { return { bind() { return {}; } }; },
      async batch() { return [{ meta: { changes: 1 } }, { meta: { changes: 2 } }]; },
    },
    FEEDBACK_DB: { prepare() { return { bind() { return { async run() { return { meta: { changes: 3 } }; } }; } }; } },
  };
  worker.scheduled({}, env, { waitUntil(promise) { tracked = promise; } });
  assert.ok(tracked instanceof Promise);
  assert.deepEqual(await tracked, [{ deliveriesRemoved: 1, devicesRemoved: 2 }, { feedbackRemoved: 3 }]);
});
