import assert from "node:assert/strict";
import test from "node:test";

import {
  assertNoSecretArguments,
  parseTokenFile,
  redactNotificationId,
} from "./send-ios-push.mjs";

test("rejects secret-bearing command arguments", () => {
  assert.throws(
    () => assertNoSecretArguments(["status", "campaign", "--token=secret"]),
    /secret arguments/i,
  );
  assert.doesNotThrow(() => assertNoSecretArguments(["status", "campaign"]));
});

test("requires mode 600 and parses only PUSH_ADMIN_TOKEN", () => {
  assert.throws(() => parseTokenFile("PUSH_ADMIN_TOKEN=value\n", 0o644), /0600/);
  assert.equal(parseTokenFile("PUSH_ADMIN_TOKEN=value\n", 0o600), "value");
  assert.throws(() => parseTokenFile("OTHER=value\n", 0o600), /PUSH_ADMIN_TOKEN/);
});

test("redacts the Notification ID to a suffix", () => {
  assert.equal(redactNotificationId("0123456789abcdef"), "…cdef");
  assert.equal(redactNotificationId(undefined), null);
});
