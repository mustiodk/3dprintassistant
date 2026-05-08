import test from "node:test";
import assert from "node:assert/strict";
import {
  onRequestPost,
  __test,
} from "./analytics-query.js";

function request(body, token = "admin-secret") {
  return new Request("https://3dprintassistant.com/api/analytics-query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://3dprintassistant.com",
      "X-Analytics-Admin-Token": token,
    },
    body: JSON.stringify(body),
  });
}

async function json(res) {
  return JSON.parse(await res.text());
}

test("buildQuery returns weighted overview SQL", () => {
  const sql = __test.buildQuery("overview", { days: 7, limit: 25 });

  assert.match(sql, /FROM "3dpa_usage_v1"/);
  assert.match(sql, /SUM\(_sample_interval \* double1\) AS events/);
  assert.match(sql, /INTERVAL '7' DAY/);
  assert.match(sql, /LIMIT 25/);
  assert.match(sql, /FORMAT JSON$/);
});

test("buildQuery includes profile details output mode", () => {
  const sql = __test.buildQuery("profile_details", { days: 7, limit: 25 });

  assert.match(sql, /blob8 AS printer_brand/);
  assert.match(sql, /blob9 AS printer_model/);
  assert.match(sql, /blob11 AS material/);
  assert.match(sql, /blob20 AS output_mode/);
  assert.match(sql, /AND blob2 = 'profile_generated'/);
});

test("optionsFromPayload clamps days and limit", () => {
  assert.deepEqual(__test.optionsFromPayload({ days: 999, limit: 999 }), {
    days: 90,
    limit: 100,
  });
  assert.deepEqual(__test.optionsFromPayload({ days: -4, limit: 1 }), {
    days: 1,
    limit: 5,
  });
});

test("onRequestPost rejects missing admin token", async () => {
  const res = await onRequestPost({
    request: request({ query: "overview" }, "wrong"),
    env: {
      ANALYTICS_ADMIN_TOKEN: "admin-secret",
      CLOUDFLARE_ACCOUNT_ID: "account",
      CLOUDFLARE_ANALYTICS_READ_TOKEN: "read-token",
    },
  });

  assert.equal(res.status, 401);
  assert.equal((await json(res)).error, "unauthorized");
});

test("onRequestPost rejects raw or unknown query ids", async () => {
  const res = await onRequestPost({
    request: request({ query: "SELECT * FROM nope" }),
    env: {
      ANALYTICS_ADMIN_TOKEN: "admin-secret",
      CLOUDFLARE_ACCOUNT_ID: "account",
      CLOUDFLARE_ANALYTICS_READ_TOKEN: "read-token",
    },
  });

  assert.equal(res.status, 400);
  assert.equal((await json(res)).error, "invalid_query");
});

test("onRequestPost proxies a canned query to Cloudflare SQL API", async () => {
  const oldFetch = globalThis.fetch;
  let outbound;
  globalThis.fetch = async (url, init) => {
    outbound = { url, init };
    return new Response(JSON.stringify({
      data: [
        { event: "app_opened", platform: "web", channel: "production", events: 4 },
      ],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const res = await onRequestPost({
      request: request({ query: "overview", days: 7, limit: 25 }),
      env: {
        ANALYTICS_ADMIN_TOKEN: "admin-secret",
        CLOUDFLARE_ACCOUNT_ID: "abc123",
        CLOUDFLARE_ANALYTICS_READ_TOKEN: "read-token",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(outbound.url, "https://api.cloudflare.com/client/v4/accounts/abc123/analytics_engine/sql");
    assert.equal(outbound.init.headers.Authorization, "Bearer read-token");
    assert.match(outbound.init.body, /blob2 AS event/);
    assert.deepEqual(await json(res), {
      ok: true,
      query: "overview",
      days: 7,
      limit: 25,
      result: {
        data: [
          { event: "app_opened", platform: "web", channel: "production", events: 4 },
        ],
      },
    });
  } finally {
    globalThis.fetch = oldFetch;
  }
});
