import { describe, expect, it, vi } from "vitest";

import {
  AuthError,
  constantTimeEqual,
  signRegistrationBody,
  verifySignedRequest,
} from "./auth.js";

const encoder = new TextEncoder();
const secret = "registration-test-secret";
const rawBody = encoder.encode('{"schema_version":1}');
const nowMs = 1_720_000_000_000;
const timestamp = String(Math.floor(nowMs / 1000));

describe("push registration request authentication", () => {
  it("signs timestamp, newline, and the exact raw bytes with base64 HMAC-SHA256", async () => {
    const signature = await signRegistrationBody(secret, timestamp, rawBody);
    const changed = await signRegistrationBody(
      secret,
      timestamp,
      encoder.encode('{"schema_version":1 }'),
    );
    expect(signature).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(changed).not.toBe(signature);
  });

  it("accepts requests inside the inclusive five-minute skew", async () => {
    const signature = await signRegistrationBody(secret, timestamp, rawBody);
    await expect(
      verifySignedRequest(
        { timestamp, signature, rawBody },
        secret,
        nowMs + 300_000,
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects stale, future, malformed, and incorrect signatures", async () => {
    const signature = await signRegistrationBody(secret, timestamp, rawBody);
    await expect(
      verifySignedRequest(
        { timestamp, signature, rawBody },
        secret,
        nowMs + 301_000,
      ),
    ).rejects.toBeInstanceOf(AuthError);
    const futureTimestamp = String(Math.floor(nowMs / 1000) + 301);
    await expect(
      verifySignedRequest(
        {
          timestamp: futureTimestamp,
          signature: await signRegistrationBody(secret, futureTimestamp, rawBody),
          rawBody,
        },
        secret,
        nowMs,
      ),
    ).rejects.toBeInstanceOf(AuthError);
    await expect(
      verifySignedRequest(
        { timestamp: "not-a-time", signature, rawBody },
        secret,
        nowMs,
      ),
    ).rejects.toBeInstanceOf(AuthError);
    await expect(
      verifySignedRequest(
        { timestamp, signature: `${signature.slice(0, -2)}AA`, rawBody },
        secret,
        nowMs,
      ),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("uses a fixed-length constant-time comparison result", async () => {
    const spy = vi.fn(crypto.subtle.timingSafeEqual.bind(crypto.subtle));
    await expect(constantTimeEqual("same", "same", spy)).resolves.toBe(true);
    await expect(constantTimeEqual("short", "a much longer value", spy)).resolves.toBe(false);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls.every(([left, right]) => left.byteLength === right.byteLength)).toBe(true);
  });
});
