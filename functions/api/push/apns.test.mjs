import { describe, expect, it, vi } from "vitest";

import {
  buildAPNsRequest,
  classifyAPNsResponse,
  createAPNsClient,
} from "./apns.js";

async function privateKeyPEM() {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const bytes = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const base64 = btoa(String.fromCharCode(...bytes));
  return `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----`;
}

const payload = {
  aps: { alert: { title: "Title", body: "Body" }, sound: "default" },
  schema_version: 1,
  announcement_id: "announcement-1",
  kind: "new_printer",
  brand_id: "snapmaker",
  printer_id: "snapmaker_u1",
};

describe("APNs provider client", () => {
  it("pins provider headers and bounds expiration to one hour", async () => {
    const now = 1_720_000_000;
    const request = buildAPNsRequest({
      environment: "production",
      tokenHex: "0011",
      payload,
      jwt: "header.payload.signature",
      topic: "dk.mragile.3DPrintAssistant",
      nowEpochSeconds: now,
    });
    expect(request.url).toBe("https://api.push.apple.com/3/device/0011");
    expect(request.headers.get("apns-topic")).toBe("dk.mragile.3DPrintAssistant");
    expect(request.headers.get("apns-push-type")).toBe("alert");
    expect(request.headers.get("apns-priority")).toBe("10");
    expect(request.headers.get("apns-collapse-id")).toBe("announcement-1");
    const expiration = Number(request.headers.get("apns-expiration"));
    expect(Number.isInteger(expiration)).toBe(true);
    expect(expiration).toBeGreaterThan(now);
    expect(expiration).toBeLessThanOrEqual(now + 3600);
  });

  it("reuses an ES256 JWT at 49 minutes and refreshes after 50", async () => {
    let now = 1_720_000_000;
    const authorizations = [];
    const fetchImpl = vi.fn(async (request) => {
      authorizations.push(request.headers.get("Authorization"));
      return new Response(null, { status: 200 });
    });
    const client = createAPNsClient({ fetchImpl, nowEpochSeconds: () => now });
    const credentials = {
      keyId: "KEY123",
      teamId: "TEAM123",
      privateKeyPEM: await privateKeyPEM(),
      topic: "dk.mragile.3DPrintAssistant",
    };
    const send = () => client.send({ credentials, environment: "development", tokenHex: "0011", payload });
    await send();
    now += 49 * 60;
    await send();
    now += 2 * 60;
    await send();
    expect(authorizations[0]).toBe(authorizations[1]);
    expect(authorizations[2]).not.toBe(authorizations[1]);
    expect(authorizations.every((value) => value.startsWith("bearer "))).toBe(true);
  });

  it.each([
    [200, null, "accepted"],
    [410, { reason: "Unregistered" }, "invalid"],
    [400, { reason: "BadDeviceToken" }, "invalid"],
    [400, { reason: "DeviceTokenNotForTopic" }, "invalid"],
    [429, { reason: "TooManyRequests" }, "retryable"],
    [500, { reason: "InternalServerError" }, "retryable"],
    [403, { reason: "Anything" }, "blocked"],
    [400, { reason: "TopicDisallowed" }, "blocked"],
    [400, { reason: "BadCollapseId" }, "failed"],
  ])("classifies APNs %s as %s", async (status, body, classification) => {
    const response = new Response(body ? JSON.stringify(body) : null, {
      status,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    });
    await expect(classifyAPNsResponse(response)).resolves.toMatchObject({ classification });
  });

  it("classifies transport failures as retryable", async () => {
    const client = createAPNsClient({
      fetchImpl: vi.fn(async () => { throw new Error("network down"); }),
      nowEpochSeconds: () => 1_720_000_000,
    });
    await expect(
      client.send({
        credentials: {
          keyId: "KEY123",
          teamId: "TEAM123",
          privateKeyPEM: await privateKeyPEM(),
          topic: "dk.mragile.3DPrintAssistant",
        },
        environment: "production",
        tokenHex: "0011",
        payload,
      }),
    ).resolves.toMatchObject({ classification: "retryable", reason: "transport" });
  });
});
