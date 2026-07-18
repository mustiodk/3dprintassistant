import { describe, expect, it } from "vitest";

import {
  decryptToken,
  encryptToken,
  hashToken,
  notificationIdForHash,
} from "./crypto.js";

const keyA = crypto.getRandomValues(new Uint8Array(32));
const keyB = crypto.getRandomValues(new Uint8Array(32));

describe("push token cryptography", () => {
  it("round-trips a token with AES-GCM key version 1", async () => {
    const encrypted = await encryptToken("00aabbcc", keyA);
    expect(encrypted).toMatchObject({ keyVersion: 1 });
    expect(encrypted.iv).not.toContain("00aabbcc");
    expect(encrypted.ciphertext).not.toContain("00aabbcc");
    await expect(decryptToken(encrypted, keyA)).resolves.toBe("00aabbcc");
  });

  it("fails closed with the wrong encryption key", async () => {
    const encrypted = await encryptToken("11223344", keyA);
    await expect(decryptToken(encrypted, keyB)).rejects.toThrow();
  });

  it("hashes token bytes and derives a 16-hex support id", async () => {
    const hash = await hashToken("00aabbcc");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(notificationIdForHash(hash)).toBe(hash.slice(0, 16));
  });
});
