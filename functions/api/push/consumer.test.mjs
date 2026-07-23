import { env } from "cloudflare:workers";
import {
  createExecutionContext,
  createMessageBatch,
  getQueueResult,
} from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { processQueueBatch } from "./consumer.js";
import { hashToken } from "./crypto.js";
import { registerDevice } from "./repository.js";

const now = 1_720_000_000;
const keyBytes = new Uint8Array(32);
const cursor = {
  schema_version: 1,
  campaign_id: "campaign-queue",
  environment: "development",
  after_token_hash: null,
};

async function clearDatabase() {
  await env.PUSH_DB.batch([
    env.PUSH_DB.prepare("DELETE FROM push_replay_cursors"),
    env.PUSH_DB.prepare("DELETE FROM push_deliveries"),
    env.PUSH_DB.prepare("DELETE FROM push_campaigns"),
    env.PUSH_DB.prepare("DELETE FROM push_devices"),
  ]);
}

async function seedCampaign(status = "queued") {
  await env.PUSH_DB.prepare(
    `INSERT INTO push_campaigns (
      campaign_id, environment, topic, kind, title, body, brand_id, printer_id,
      announcement_id, audience_mode, preview_digest, status, created_at
    ) VALUES ('campaign-queue', 'development', 'new_printers', 'new_printer',
      'A new printer is ready', 'Snapmaker U1 is now supported.', 'snapmaker',
      'snapmaker_u1', 'announcement-queue', 'canary', 'digest', ?, ?)`,
  ).bind(status, now).run();
}

async function addDelivery(tokenHex, status = "pending") {
  await registerDevice(
    env,
    {
      tokenHex,
      environment: "development",
      topicsMask: 1,
      appVersion: "1.1.0",
      buildNumber: "1",
    },
    { keyBytes, now },
  );
  const tokenHash = await hashToken(tokenHex);
  await env.PUSH_DB.prepare(
    `INSERT INTO push_deliveries (
      campaign_id, environment, token_hash, status, attempts, updated_at
    ) VALUES ('campaign-queue', 'development', ?, ?, 0, ?)`,
  ).bind(tokenHash, status, now).run();
  return tokenHash;
}

function makeBatch(attempts = 1) {
  return createMessageBatch("3dpa-push-production", [
    { id: "message-1", timestamp: new Date(now * 1000), body: cursor, attempts },
  ]);
}

function testEnv(overrides = {}) {
  return {
    ...env,
    PUSH_TOKEN_ENCRYPTION_KEY_V1: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    APNS_KEY_ID: "KEY",
    APNS_TEAM_ID: "TEAM",
    APNS_PRIVATE_KEY_P8: "test-key",
    APNS_TOPIC: "dk.mragile.3DPrintAssistant",
    PUSH_FANOUT: { send: vi.fn(async () => undefined) },
    PUSH_DLQ: { send: vi.fn(async () => undefined) },
    ...overrides,
  };
}

async function run(batch, overrides = {}, result = { classification: "accepted", status: 200 }) {
  const ctx = createExecutionContext();
  const send = vi.fn(async () => result);
  const runtimeEnv = testEnv(overrides);
  await processQueueBatch(batch, runtimeEnv, ctx, {
    apnsClient: { send },
    now: () => now + 1,
  });
  return { send, runtimeEnv, queueResult: await getQueueResult(batch, ctx) };
}

beforeEach(clearDatabase);

describe("bounded APNs fan-out", () => {
  it("stops before loading a cancelled page", async () => {
    await seedCampaign("cancelled");
    await addDelivery("0011");
    const { send, queueResult } = await run(makeBatch());
    expect(send).not.toHaveBeenCalled();
    expect(queueResult.explicitAcks).toEqual(["message-1"]);
  });

  it("rechecks cancellation before every send", async () => {
    await seedCampaign();
    await addDelivery("0011");
    await addDelivery("0022");
    const ctx = createExecutionContext();
    const send = vi.fn(async () => {
      await env.PUSH_DB.prepare(
        "UPDATE push_campaigns SET status = 'cancelled' WHERE campaign_id = 'campaign-queue'",
      ).run();
      return { classification: "accepted", status: 200 };
    });
    const batch = makeBatch();
    await processQueueBatch(batch, testEnv(), ctx, {
      apnsClient: { send },
      now: () => now + 1,
      concurrency: 1,
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("marks a disappeared device consent_removed without retry or DLQ", async () => {
    await seedCampaign();
    const tokenHash = await addDelivery("0011");
    await env.PUSH_DB.prepare(
      "DELETE FROM push_devices WHERE environment = 'development' AND token_hash = ?",
    ).bind(tokenHash).run();
    const { send, runtimeEnv, queueResult } = await run(makeBatch());
    expect(send).not.toHaveBeenCalled();
    expect(runtimeEnv.PUSH_DLQ.send).not.toHaveBeenCalled();
    expect(
      await env.PUSH_DB.prepare("SELECT status FROM push_deliveries").first("status"),
    ).toBe("consent_removed");
    expect(queueResult.retryMessages).toEqual([]);
  });

  it("lets rotation win via compare-and-set and skips terminal replay rows", async () => {
    await seedCampaign();
    const oldHash = await addDelivery("0011");
    await registerDevice(
      env,
      {
        tokenHex: "0022",
        previousTokenHex: "0011",
        environment: "development",
        topicsMask: 1,
        appVersion: "1.1.0",
        buildNumber: "1",
      },
      { keyBytes, now: now + 1 },
    );
    expect(
      await env.PUSH_DB.prepare(
        "SELECT status FROM push_deliveries WHERE token_hash = ?",
      ).bind(oldHash).first("status"),
    ).toBe("token_rotated");
    const { send } = await run(makeBatch());
    expect(send).not.toHaveBeenCalled();
  });

  it("blocks on any 403, preserves the unchanged cursor, and sends no call after the block", async () => {
    await seedCampaign();
    await addDelivery("0011");
    await addDelivery("0022");
    await addDelivery("0033");
    let blocked = false;
    let callsAfterBlock = 0;
    const send = vi.fn(async () => {
      if (blocked) callsAfterBlock += 1;
      blocked = true;
      return { classification: "blocked", status: 403, reason: "InvalidProviderToken" };
    });
    const batch = makeBatch();
    const ctx = createExecutionContext();
    const runtimeEnv = testEnv();
    await processQueueBatch(batch, runtimeEnv, ctx, {
      apnsClient: { send },
      now: () => now + 1,
    });
    const queueResult = await getQueueResult(batch, ctx);
    expect(send).toHaveBeenCalledTimes(1);
    expect(callsAfterBlock).toBe(0);
    expect(queueResult.explicitAcks).toEqual(["message-1"]);
    expect(runtimeEnv.PUSH_DLQ.send).toHaveBeenCalledWith(cursor);
    expect(
      await env.PUSH_DB.prepare("SELECT status FROM push_campaigns").first("status"),
    ).toBe("blocked");
    expect(
      await env.PUSH_DB.prepare("SELECT cursor_json FROM push_replay_cursors").first("cursor_json"),
    ).toBe(JSON.stringify(cursor));
    expect(
      await env.PUSH_DB.prepare("SELECT COUNT(*) AS count FROM push_devices").first("count"),
    ).toBe(3);
  });

  it("completes a campaign when every delivery is accepted", async () => {
    await seedCampaign();
    await addDelivery("0011");
    await addDelivery("0022");
    await run(makeBatch());
    const row = await env.PUSH_DB.prepare(
      "SELECT status, completed_at, accepted_count FROM push_campaigns",
    ).first();
    expect(row.status).toBe("complete");
    expect(row.completed_at).not.toBeNull();
    expect(row.accepted_count).toBe(2);
  });

  it("marks a campaign partial when some deliveries are invalid", async () => {
    await seedCampaign();
    await addDelivery("0011");
    await addDelivery("0022");
    const ctx = createExecutionContext();
    const send = vi
      .fn()
      .mockResolvedValueOnce({ classification: "invalid", status: 410, reason: "Unregistered" })
      .mockResolvedValue({ classification: "accepted", status: 200, reason: null });
    await processQueueBatch(makeBatch(), testEnv(), ctx, {
      apnsClient: { send },
      now: () => now + 1,
    });
    await getQueueResult(makeBatch(), ctx);
    const row = await env.PUSH_DB.prepare(
      "SELECT status, invalid_count, accepted_count FROM push_campaigns",
    ).first();
    // RED demo verified 2026-07-23: asserting "complete" here fails with
    // status "partial" — the invalid_count>0 branch is exercised for real.
    expect(row.status).toBe("partial");
    expect(row.invalid_count).toBe(1);
    expect(row.accepted_count).toBe(1);
  });

  it("fails a campaign when no delivery is accepted", async () => {
    await seedCampaign();
    await addDelivery("0011");
    await run(
      makeBatch(),
      {},
      { classification: "failed", status: 400, reason: "BadCollapseId" },
    );
    const row = await env.PUSH_DB.prepare(
      "SELECT status, failed_count, accepted_count FROM push_campaigns",
    ).first();
    expect(row.status).toBe("failed");
    expect(row.failed_count).toBe(1);
    expect(row.accepted_count).toBe(0);
  });

  it("preserves exhausted retryable work before explicit DLQ", async () => {
    await seedCampaign();
    await addDelivery("0011");
    const { runtimeEnv, queueResult } = await run(
      makeBatch(5),
      {},
      { classification: "retryable", status: 500, reason: "InternalServerError" },
    );
    expect(runtimeEnv.PUSH_DLQ.send).toHaveBeenCalledWith(cursor);
    expect(
      await env.PUSH_DB.prepare("SELECT reason FROM push_replay_cursors").first("reason"),
    ).toBe("retry_exhausted");
    expect(queueResult.explicitAcks).toEqual(["message-1"]);
  });
});
