import { env, exports as workerExports } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { handlePushRequest } from "./index.js";

const encoder = new TextEncoder();

async function signature(secret, timestamp, rawBody) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const prefix = encoder.encode(`${timestamp}\n`);
  const signed = new Uint8Array(prefix.length + rawBody.length);
  signed.set(prefix);
  signed.set(rawBody, prefix.length);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, signed));
  return btoa(String.fromCharCode(...bytes));
}

async function signedRequest(path, body, method = "POST") {
  const rawBody = encoder.encode(JSON.stringify(body));
  const timestamp = String(Math.floor(Date.now() / 1000));
  return new Request(`https://3dprintassistant.test${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-3DPA-Timestamp": timestamp,
      "X-3DPA-Signature": await signature(
        env.IOS_PUSH_REGISTRATION_SECRET,
        timestamp,
        rawBody,
      ),
      "CF-Connecting-IP": "192.0.2.1",
    },
    body: rawBody,
  });
}

const registration = {
  schema_version: 1,
  token: "001122334455",
  environment: "development",
  topics: ["new_printers"],
  app_version: "1.1.0",
  build_number: "202607181200",
};

beforeEach(async () => {
  await env.PUSH_DB.batch([
    env.PUSH_DB.prepare("DELETE FROM push_replay_cursors"),
    env.PUSH_DB.prepare("DELETE FROM push_deliveries"),
    env.PUSH_DB.prepare("DELETE FROM push_campaigns"),
    env.PUSH_DB.prepare("DELETE FROM push_devices"),
  ]);
});

describe("push registration Worker boundary", () => {
  it("registers and unregisters through the exported Worker with real D1", async () => {
    const registerResponse = await workerExports.default.fetch(
      await signedRequest("/api/push/register", registration),
    );
    expect(registerResponse.status).toBe(200);
    await expect(registerResponse.json()).resolves.toMatchObject({
      topics: ["new_printers"],
    });
    expect(
      await env.PUSH_DB.prepare("SELECT COUNT(*) AS count FROM push_devices").first("count"),
    ).toBe(1);

    const unregisterResponse = await workerExports.default.fetch(
      await signedRequest("/api/push/unregister", {
        schema_version: 1,
        token: registration.token,
        environment: registration.environment,
      }),
    );
    expect(unregisterResponse.status).toBe(200);
    await expect(unregisterResponse.json()).resolves.toEqual({ removed: true });
  });

  it("rate-limits register by source IP without persisting it", async () => {
    const limit = vi.fn(async () => ({ success: false }));
    const response = await handlePushRequest(
      await signedRequest("/api/push/register", registration),
      {
        ...env,
        PUSH_TEST_RATE_LIMIT_BYPASS: "false",
        PUSH_REGISTRATION_RATE_LIMITER: { limit },
      },
    );
    expect(response.status).toBe(429);
    expect(limit).toHaveBeenCalledWith({ key: "192.0.2.1" });
    const schema = await env.PUSH_DB.prepare(
      "SELECT sql FROM sqlite_schema WHERE type = 'table'",
    ).all();
    expect(JSON.stringify(schema.results)).not.toMatch(
      /\b(?:ip|ip_address|user_agent)\b/i,
    );
  });

  it("fails register closed while leaving unregister idempotently open", async () => {
    const disabledEnv = { ...env, PUSH_REGISTRATION_ENABLED: "false" };
    const registerResponse = await handlePushRequest(
      await signedRequest("/api/push/register", registration),
      disabledEnv,
    );
    expect(registerResponse.status).toBe(503);

    const unregisterResponse = await handlePushRequest(
      await signedRequest("/api/push/unregister", {
        schema_version: 1,
        token: registration.token,
        environment: registration.environment,
      }),
      disabledEnv,
    );
    expect(unregisterResponse.status).toBe(200);
    await expect(unregisterResponse.json()).resolves.toEqual({ removed: false });
  });

  it("returns 405 for every non-POST registration method", async () => {
    const response = await workerExports.default.fetch(
      new Request("https://3dprintassistant.test/api/push/register", {
        method: "GET",
      }),
    );
    expect(response.status).toBe(405);
  });
});
