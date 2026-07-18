import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { runRetention } from "./retention.js";

const day = 86_400;
const now = 1_720_000_000;

beforeEach(async () => {
  await env.PUSH_DB.batch([
    env.PUSH_DB.prepare("DELETE FROM push_replay_cursors"),
    env.PUSH_DB.prepare("DELETE FROM push_deliveries"),
    env.PUSH_DB.prepare("DELETE FROM push_campaigns"),
    env.PUSH_DB.prepare("DELETE FROM push_devices"),
  ]);
});

describe("push privacy retention", () => {
  it("removes 30-day deliveries and 180-day stale devices but keeps newer rows", async () => {
    await env.PUSH_DB.prepare(
      `INSERT INTO push_campaigns (
        campaign_id, environment, topic, kind, title, body, announcement_id,
        audience_mode, preview_digest, status, created_at
      ) VALUES ('retention', 'development', 'new_printers', 'new_printer',
        'Title', 'Body', 'announcement', 'canary', 'digest', 'complete', ?)`,
    ).bind(now - 200 * day).run();
    const deviceInsert = env.PUSH_DB.prepare(
      `INSERT INTO push_devices (
        environment, token_hash, token_ciphertext, token_iv,
        encryption_key_version, topics, app_version, build_number,
        created_at, updated_at, last_apns_success_at
      ) VALUES ('development', ?, 'cipher', 'iv', 1, 1, '1.1.0', '1', ?, ?, ?)`,
    );
    await env.PUSH_DB.batch([
      deviceInsert.bind("a".repeat(64), now - 200 * day, now - 181 * day, null),
      deviceInsert.bind("b".repeat(64), now - 200 * day, now - 181 * day, now - 10 * day),
      deviceInsert.bind("c".repeat(64), now - 10 * day, now - 10 * day, null),
      env.PUSH_DB.prepare(
        `INSERT INTO push_deliveries (
          campaign_id, environment, token_hash, status, attempts, updated_at
        ) VALUES ('retention', 'development', ?, 'apns_accepted', 1, ?)`,
      ).bind("d".repeat(64), now - 31 * day),
      env.PUSH_DB.prepare(
        `INSERT INTO push_deliveries (
          campaign_id, environment, token_hash, status, attempts, updated_at
        ) VALUES ('retention', 'development', ?, 'apns_accepted', 1, ?)`,
      ).bind("e".repeat(64), now - 29 * day),
    ]);

    await expect(runRetention(env, now)).resolves.toEqual({
      deliveriesRemoved: 1,
      devicesRemoved: 1,
    });
    expect(
      await env.PUSH_DB.prepare("SELECT COUNT(*) AS count FROM push_devices").first("count"),
    ).toBe(2);
    expect(
      await env.PUSH_DB.prepare("SELECT COUNT(*) AS count FROM push_deliveries").first("count"),
    ).toBe(1);
  });
});
