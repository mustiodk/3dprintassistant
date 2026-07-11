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

// Real web payload — exactly what app.js track('troubleshoot_used', { symptom: id })
// emits after merging analyticsBaseProps() (app.js:1227).
test("validatePayload accepts the real web troubleshoot_used payload", () => {
  const result = __test.validatePayload({
    event: "troubleshoot_used",
    properties: {
      platform: "web",
      channel: "production",
      appVersion: "20260706",
      locale: "en-DK",
      symptom: "stringing",
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.event, "troubleshoot_used");
  assert.equal(result.props.symptom, "stringing");
});

test("onRequestPost writes troubleshoot_used with symptom in the event-detail blob", async () => {
  const written = [];
  const res = await onRequestPost({
    request: request({
      event: "troubleshoot_used",
      properties: {
        platform: "web",
        channel: "production",
        appVersion: "20260706",
        locale: "en-DK",
        symptom: "stringing",
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
  assert.equal(written[0].blobs[1], "troubleshoot_used");
  // blob19 is the shared per-event detail column (feedbackCategory | symptom | export type)
  assert.equal(written[0].blobs[18], "stringing");
  assert.deepEqual(written[0].indexes, ["troubleshoot_used:web"]);
});

// Real web payload — app.js track('export_clicked', { type, printerModel, nozzle, material })
// (app.js export buttons: process / filament / copy).
test("validatePayload accepts the real web export_clicked payload", () => {
  const result = __test.validatePayload({
    event: "export_clicked",
    properties: {
      platform: "web",
      channel: "production",
      appVersion: "20260706",
      locale: "en-DK",
      type: "process",
      printerModel: "x1c",
      nozzle: "std_0.4",
      material: "pla_basic",
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.event, "export_clicked");
  assert.equal(result.props.type, "process");
  assert.equal(result.props.printerModel, "x1c");
});

test("onRequestPost writes export_clicked with type in the event-detail blob and selection columns", async () => {
  const written = [];
  const res = await onRequestPost({
    request: request({
      event: "export_clicked",
      properties: {
        platform: "web",
        channel: "production",
        appVersion: "20260706",
        locale: "en-DK",
        type: "filament",
        printerModel: "x1c",
        nozzle: "std_0.4",
        material: "pla_basic",
      },
    }),
    env: {
      ANALYTICS: {
        writeDataPoint(point) { written.push(point); },
      },
    },
  });

  assert.equal(res.status, 200);
  assert.equal(written.length, 1);
  assert.equal(written[0].blobs[1], "export_clicked");
  assert.equal(written[0].blobs[18], "filament");   // event-detail blob (blob19)
  assert.equal(written[0].blobs[8], "x1c");         // printerModel (blob9)
  assert.equal(written[0].blobs[10], "pla_basic");  // material (blob11)
  assert.equal(written[0].blobs[12], "std_0.4");    // nozzle (blob13)
  assert.deepEqual(written[0].indexes, ["export_clicked:web"]);
});

test("validatePayload still rejects detail keys on the wrong event", () => {
  const crossed = __test.validatePayload({
    event: "feedback_opened",
    properties: { platform: "web", symptom: "stringing" },
  });
  assert.equal(crossed.ok, false);
  assert.equal(crossed.error, "invalid_property_symptom");

  const crossed2 = __test.validatePayload({
    event: "troubleshoot_used",
    properties: { platform: "web", type: "process" },
  });
  assert.equal(crossed2.ok, false);
  assert.equal(crossed2.error, "invalid_property_type");
});

for (const [event, properties, detail] of [
  ["workshop_saved", { platform: "ios" }, ""],
  ["workshop_loaded", { platform: "ios" }, ""],
  ["workshop_exported", { platform: "ios", type: "single" }, "single"],
  ["workshop_imported", { platform: "ios" }, ""],
]) {
  test(`validatePayload accepts ${event}`, () => {
    const result = __test.validatePayload({ event, properties });
    assert.equal(result.ok, true);
    const point = __test.toDataPoint(result.event, result.props);
    assert.equal(point.blobs[1], event);
    assert.equal(point.blobs[18], detail);
  });
}

test("Workshop events reject unrelated detail and identity keys", () => {
  assert.equal(__test.validatePayload({
    event: "workshop_saved",
    properties: { platform: "ios", profileName: "private" },
  }).error, "invalid_property_profileName");
  assert.equal(__test.validatePayload({
    event: "workshop_exported",
    properties: { platform: "ios", type: "all", sessionId: "nope" },
  }).error, "invalid_property_sessionId");
});

test("export_clicked accepts the iOS action payload on the existing contract", () => {
  for (const type of ["bambu_bundle", "text_share"]) {
    const result = __test.validatePayload({
      event: "export_clicked",
      properties: {
        platform: "ios",
        type,
        printerModel: "x1c",
        material: "pla_basic",
        nozzle: "std_0.4",
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.props.type, type);
  }
});

test("onRequestPost accepts valid Android HMAC requests", async () => {
  const secret = "test-secret";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = {
    event: "app_opened",
    properties: {
      platform: "android",
      channel: "play",
      appVersion: "2.0.0",
      buildNumber: "1",
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
        "X-App-Source": "android",
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
  assert.equal(written[0].blobs[2], "android");
  assert.deepEqual(written[0].indexes, ["app_opened:android"]);
});

test("onRequestPost rejects Android requests with a bad signature", async () => {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = JSON.stringify({
    event: "app_opened",
    properties: { platform: "android" },
  });

  const res = await onRequestPost({
    request: new Request("https://3dprintassistant.com/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Source": "android",
        "X-Timestamp": timestamp,
        "X-Signature": Buffer.from("wrong-signature").toString("base64"),
      },
      body: rawBody,
    }),
    env: {
      FEEDBACK_HMAC_SECRET: "test-secret",
      ANALYTICS: { writeDataPoint() {} },
    },
  });

  assert.equal(res.status, 401);
  assert.equal((await json(res)).error, "signature_mismatch");
});

test("onRequestPost still rejects unknown native sources without an allowed origin", async () => {
  const res = await onRequestPost({
    request: new Request("https://3dprintassistant.com/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Source": "windows",
      },
      body: JSON.stringify({
        event: "app_opened",
        properties: { platform: "windows" },
      }),
    }),
    env: {
      ANALYTICS: { writeDataPoint() {} },
    },
  });

  assert.equal(res.status, 403);
  assert.equal((await json(res)).error, "forbidden_origin");
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
