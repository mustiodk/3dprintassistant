import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  onRequestPost,
  __test,
} from "./analytics.js";

function request(body, headers = {}) {
  return new Request("https://3dprintassistant.com/api/analytics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://3dprintassistant.com",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function json(res) {
  return JSON.parse(await res.text());
}

test("validatePayload accepts the v1 profile_generated contract", () => {
  const result = __test.validatePayload({
    event: "profile_generated",
    properties: {
      platform: "web",
      channel: "production",
      appVersion: "1.0",
      locale: "en_DK",
      printerBrand: "bambu_lab",
      printerModel: "x1c",
      material: "petg_basic",
      materialGroup: "PETG",
      nozzle: "std_0.4",
      environment: "normal",
      support: "none",
      colors: "single",
      profileMode: "safe",
      outputMode: "advanced",
      slicer: "bambu_studio",
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.event, "profile_generated");
  assert.equal(result.props.printerModel, "x1c");
  assert.equal(result.props.outputMode, "advanced");
});

test("validatePayload rejects properties outside the event allowlist", () => {
  const result = __test.validatePayload({
    event: "profile_generated",
    properties: {
      platform: "web",
      sessionId: "nope",
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "invalid_property_sessionId");
});

test("onRequestPost writes valid web events to Analytics Engine", async () => {
  const written = [];
  const res = await onRequestPost({
    request: request({
      event: "feedback_opened",
      properties: {
        platform: "web",
        channel: "production",
        feedbackCategory: "missingPrinter",
      },
    }),
    env: {
      ANALYTICS: {
        writeDataPoint(point) { written.push(point); },
      },
    },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(await json(res), { ok: true, stored: true });
  assert.equal(written.length, 1);
  assert.equal(written[0].blobs[1], "feedback_opened");
  assert.equal(written[0].blobs[18], "missingPrinter");
  assert.equal(written[0].doubles[0], 1);
  assert.deepEqual(written[0].indexes, ["feedback_opened:web"]);
});

test("onRequestPost accepts valid iOS HMAC requests", async () => {
  const secret = "test-secret";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = {
    event: "app_opened",
    properties: {
      platform: "ios",
      channel: "sandbox_or_testflight",
      appVersion: "1.0.3",
      buildNumber: "202605081930",
    },
  };
  const rawBody = JSON.stringify(body);
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}\n${rawBody}`)
    .digest("base64");
  const written = [];

  const res = await onRequestPost({
    request: new Request("https://3dprintassistant.com/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Source": "ios",
        "X-Timestamp": timestamp,
        "X-Signature": signature,
      },
      body: rawBody,
    }),
    env: {
      FEEDBACK_HMAC_SECRET: secret,
      ANALYTICS: {
        writeDataPoint(point) { written.push(point); },
      },
    },
  });

  assert.equal(res.status, 200);
  assert.equal(written.length, 1);
  assert.equal(written[0].blobs[2], "ios");
});
