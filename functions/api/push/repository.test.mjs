import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { hashToken } from "./crypto.js";
import {
  AmbiguousNotificationIdError,
  registerDevice,
  resolveNotificationId,
  unregisterDevice,
} from "./repository.js";

const keyBytes = Uint8Array.from({ length: 32 }, (_, index) => index);
const oldInput = {
  tokenHex: "00112233",
  environment: "development",
  topicsMask: 1,
  appVersion: "1.1.0",
  buildNumber: "1",
};

async function clearDatabase() {
  await env.PUSH_DB.batch([
    env.PUSH_DB.prepare("DELETE FROM push_replay_cursors"),
    env.PUSH_DB.prepare("DELETE FROM push_deliveries"),
    env.PUSH_DB.prepare("DELETE FROM push_campaigns"),
    env.PUSH_DB.prepare("DELETE FROM push_devices"),
  ]);
}

async function insertCampaign(id = "campaign-1") {
  await env.PUSH_DB.prepare(
    `INSERT INTO push_campaigns (
      campaign_id, environment, topic, kind, title, body, announcement_id,
      audience_mode, preview_digest, status, created_at
    ) VALUES (?, 'development', 'new_printers', 'new_printer', 'Title', 'Body',
      'announcement-1', 'canary', 'digest', 'queued', 100)`,
  ).bind(id).run();
}

beforeEach(clearDatabase);

describe("push consent repository", () => {
  it("upserts duplicate registration without storing raw token material", async () => {
    const first = await registerDevice(env, oldInput, { keyBytes, now: 100 });
    const second = await registerDevice(
      env,
      { ...oldInput, topicsMask: 3, appVersion: "1.1.1" },
      { keyBytes, now: 200 },
    );
    expect(first.notificationId).toMatch(/^[0-9a-f]{16}$/);
    expect(second).toMatchObject({ notificationId: first.notificationId, topics: 3 });

    const rows = await env.PUSH_DB.prepare("SELECT * FROM push_devices").all();
    expect(rows.results).toHaveLength(1);
    expect(rows.results[0]).toMatchObject({
      topics: 3,
      app_version: "1.1.1",
      created_at: 100,
      updated_at: 200,
    });
    expect(JSON.stringify(rows.results[0])).not.toContain(oldInput.tokenHex);
  });

  it("rotates atomically and increments only actual delivery transitions", async () => {
    await registerDevice(env, oldInput, { keyBytes, now: 100 });
    await insertCampaign();
    const oldHash = await hashToken(oldInput.tokenHex);
    await env.PUSH_DB.prepare(
      `INSERT INTO push_deliveries (
        campaign_id, environment, token_hash, status, attempts, updated_at
      ) VALUES ('campaign-1', 'development', ?, 'pending', 0, 100)`,
    ).bind(oldHash).run();

    const rotatedInput = {
      ...oldInput,
      tokenHex: "ffeeddcc",
      previousTokenHex: oldInput.tokenHex,
    };
    await registerDevice(env, rotatedInput, { keyBytes, now: 200 });
    await registerDevice(env, rotatedInput, { keyBytes, now: 300 });

    const devices = await env.PUSH_DB.prepare(
      "SELECT token_hash FROM push_devices",
    ).all();
    const delivery = await env.PUSH_DB.prepare(
      "SELECT status FROM push_deliveries WHERE campaign_id = 'campaign-1'",
    ).first();
    const campaign = await env.PUSH_DB.prepare(
      "SELECT token_rotated_count FROM push_campaigns WHERE campaign_id = 'campaign-1'",
    ).first();
    expect(devices.results).toHaveLength(1);
    expect(devices.results[0].token_hash).toBe(await hashToken("ffeeddcc"));
    expect(delivery.status).toBe("token_rotated");
    expect(campaign.token_rotated_count).toBe(1);
  });

  it("rejects ambiguous 16-hex notification prefixes", async () => {
    const base = {
      environment: "development",
      token_ciphertext: "cipher",
      token_iv: "iv",
      encryption_key_version: 1,
      topics: 1,
      app_version: "1.1.0",
      build_number: "1",
      created_at: 100,
      updated_at: 100,
    };
    const insert = env.PUSH_DB.prepare(
      `INSERT INTO push_devices (
        environment, token_hash, token_ciphertext, token_iv,
        encryption_key_version, topics, app_version, build_number,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const values = (tokenHash) => [
      base.environment,
      tokenHash,
      base.token_ciphertext,
      base.token_iv,
      base.encryption_key_version,
      base.topics,
      base.app_version,
      base.build_number,
      base.created_at,
      base.updated_at,
    ];
    await env.PUSH_DB.batch([
      insert.bind(...values("a".repeat(16) + "0".repeat(48))),
      insert.bind(...values("a".repeat(16) + "1".repeat(48))),
    ]);
    await expect(
      resolveNotificationId(env.PUSH_DB, "a".repeat(16)),
    ).rejects.toBeInstanceOf(AmbiguousNotificationIdError);
  });

  it("deletes consent and device-specific deliveries idempotently", async () => {
    await registerDevice(env, oldInput, { keyBytes, now: 100 });
    await insertCampaign();
    const tokenHash = await hashToken(oldInput.tokenHex);
    await env.PUSH_DB.prepare(
      `INSERT INTO push_deliveries (
        campaign_id, environment, token_hash, status, attempts, updated_at
      ) VALUES ('campaign-1', 'development', ?, 'pending', 0, 100)`,
    ).bind(tokenHash).run();

    await expect(unregisterDevice(env, oldInput)).resolves.toEqual({ removed: true });
    await expect(unregisterDevice(env, oldInput)).resolves.toEqual({ removed: false });
    expect(
      await env.PUSH_DB.prepare("SELECT COUNT(*) AS count FROM push_devices").first("count"),
    ).toBe(0);
    expect(
      await env.PUSH_DB.prepare("SELECT COUNT(*) AS count FROM push_deliveries").first("count"),
    ).toBe(0);
  });
});
