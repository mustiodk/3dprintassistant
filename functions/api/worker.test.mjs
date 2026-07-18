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
