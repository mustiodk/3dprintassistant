import { env, exports as workerExports } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerDevice } from "./repository.js";
import {
  CampaignError,
  authorizeAdmin,
  campaignStatus,
  cancelCampaign,
  createCampaign,
  previewCampaign,
  replayCampaignCursor,
  validateCampaignDraft,
} from "./campaigns.js";

const keyBytes = new Uint8Array(32);
const now = 1_720_000_000;
const newPrinterDraft = {
  schema_version: 1,
  campaign_id: "printer-u1-20260718",
  environment: "development",
  topic: "new_printers",
  kind: "new_printer",
  title: "A new printer is ready",
  body: "Snapmaker U1 is now supported.",
  brand_id: "snapmaker",
  printer_id: "snapmaker_u1",
  announcement_id: "printer-snapmaker-u1-20260718",
  audience_mode: "public",
};

async function clearDatabase() {
  await env.PUSH_DB.batch([
    env.PUSH_DB.prepare("DELETE FROM push_replay_cursors"),
    env.PUSH_DB.prepare("DELETE FROM push_deliveries"),
    env.PUSH_DB.prepare("DELETE FROM push_campaigns"),
    env.PUSH_DB.prepare("DELETE FROM push_devices"),
  ]);
}

async function addDevice(tokenHex, topicsMask = 3) {
  return registerDevice(
    env,
    {
      tokenHex,
      environment: "development",
      topicsMask,
      appVersion: "1.1.0",
      buildNumber: "1",
    },
    { keyBytes, now },
  );
}

beforeEach(clearDatabase);

describe("push campaign boundary", () => {
  it("dispatches authenticated previews through the exported Worker", async () => {
    const request = (token) =>
      workerExports.default.fetch(
        new Request("https://example.test/api/push/admin/campaigns", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newPrinterDraft),
        }),
      );
    await expect(request("wrong-token").then((response) => response.status)).resolves.toBe(401);
    const response = await request(env.PUSH_ADMIN_TOKEN);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      campaign_id: newPrinterDraft.campaign_id,
      matching_count: 0,
    });
  });

  it("authenticates the dedicated bearer with a constant-time compare", async () => {
    const compare = vi.fn(async () => true);
    const request = new Request("https://example.test", {
      headers: { Authorization: "Bearer admin-value" },
    });
    await expect(
      authorizeAdmin(request, { PUSH_ADMIN_TOKEN: "admin-value" }, compare),
    ).resolves.toBeUndefined();
    expect(compare).toHaveBeenCalledWith("admin-value", "admin-value");
    await expect(
      authorizeAdmin(new Request("https://example.test"), {
        PUSH_ADMIN_TOKEN: "admin-value",
      }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("enforces the exact topic/kind matrix, copy bounds, and APNs payload size", () => {
    expect(validateCampaignDraft(newPrinterDraft).payload.schema_version).toBe(1);
    expect(() =>
      validateCampaignDraft({ ...newPrinterDraft, topic: "app_updates" }),
    ).toThrow("topic");
    expect(() =>
      validateCampaignDraft({ ...newPrinterDraft, release_version: "1.1.0" }),
    ).toThrow("release_version");
    expect(() =>
      validateCampaignDraft({ ...newPrinterDraft, title: "x".repeat(61) }),
    ).toThrow("title");
    expect(() =>
      validateCampaignDraft({ ...newPrinterDraft, body: "x".repeat(181) }),
    ).toThrow("body");

    const update = {
      ...newPrinterDraft,
      campaign_id: "app-update-1-1-0",
      topic: "app_updates",
      kind: "app_update",
      release_version: "1.1.0",
      announcement_id: "app-update-1-1-0",
    };
    delete update.brand_id;
    delete update.printer_id;
    expect(validateCampaignDraft(update).payload.release_version).toBe("1.1.0");
    expect(JSON.stringify(validateCampaignDraft(update).payload).length).toBeLessThan(4096);
  });

  it("previews a digest, requires same-id confirmation, and rejects duplicates", async () => {
    await addDevice("0011", 1);
    const preview = await previewCampaign(env, newPrinterDraft, { now });
    expect(preview).toMatchObject({ matching_count: 1, campaign_id: newPrinterDraft.campaign_id });
    expect(preview.preview_digest).toMatch(/^[0-9a-f]{64}$/);
    await expect(
      createCampaign(
        { ...env, PUSH_PUBLIC_SEND_ENABLED: "true" },
        { ...newPrinterDraft, confirm_campaign_id: "wrong", confirm_preview_digest: preview.preview_digest },
        { now },
      ),
    ).rejects.toThrow("confirmation");

    const enqueue = { send: vi.fn(async () => undefined) };
    await expect(
      createCampaign(
        { ...env, PUSH_PUBLIC_SEND_ENABLED: "true", PUSH_FANOUT: enqueue },
        {
          ...newPrinterDraft,
          confirm_campaign_id: newPrinterDraft.campaign_id,
          confirm_preview_digest: preview.preview_digest,
        },
        { now },
      ),
    ).resolves.toMatchObject({ status: "queued" });
    expect(enqueue.send).toHaveBeenCalledWith({
      schema_version: 1,
      campaign_id: newPrinterDraft.campaign_id,
      environment: "development",
      after_token_hash: null,
    });
    await expect(
      createCampaign(
        { ...env, PUSH_PUBLIC_SEND_ENABLED: "true", PUSH_FANOUT: enqueue },
        {
          ...newPrinterDraft,
          confirm_campaign_id: newPrinterDraft.campaign_id,
          confirm_preview_digest: preview.preview_digest,
        },
        { now },
      ),
    ).rejects.toThrow("campaign_id");
  });

  it("gates public sends, enforces rolling seven days, and exempts canaries", async () => {
    const first = await previewCampaign(env, newPrinterDraft, { now });
    await expect(
      createCampaign(
        { ...env, PUSH_PUBLIC_SEND_ENABLED: "false" },
        {
          ...newPrinterDraft,
          confirm_campaign_id: newPrinterDraft.campaign_id,
          confirm_preview_digest: first.preview_digest,
        },
        { now },
      ),
    ).rejects.toThrow("disabled");

    const enabledEnv = {
      ...env,
      PUSH_PUBLIC_SEND_ENABLED: "true",
      PUSH_FANOUT: { send: vi.fn(async () => undefined) },
    };
    await createCampaign(
      enabledEnv,
      {
        ...newPrinterDraft,
        confirm_campaign_id: newPrinterDraft.campaign_id,
        confirm_preview_digest: first.preview_digest,
      },
      { now },
    );
    const secondDraft = { ...newPrinterDraft, campaign_id: "printer-next-20260719" };
    const second = await previewCampaign(env, secondDraft, { now: now + 60 });
    await expect(
      createCampaign(
        enabledEnv,
        {
          ...secondDraft,
          confirm_campaign_id: secondDraft.campaign_id,
          confirm_preview_digest: second.preview_digest,
        },
        { now: now + 60 },
      ),
    ).rejects.toThrow("seven days");

    const device = await addDevice("aabb", 1);
    const canary = {
      ...secondDraft,
      audience_mode: "canary",
      notification_id: device.notificationId,
    };
    const canaryPreview = await previewCampaign(env, canary, { now: now + 60 });
    await expect(
      createCampaign(
        { ...enabledEnv, PUSH_PUBLIC_SEND_ENABLED: "false" },
        {
          ...canary,
          confirm_campaign_id: canary.campaign_id,
          confirm_preview_digest: canaryPreview.preview_digest,
        },
        { now: now + 60 },
      ),
    ).resolves.toMatchObject({ status: "queued" });
  });

  it("requires an exact unique canary Notification ID", async () => {
    const device = await addDevice("ccdd", 1);
    const canary = {
      ...newPrinterDraft,
      audience_mode: "canary",
      notification_id: device.notificationId.slice(0, 15),
    };
    await expect(previewCampaign(env, canary, { now })).rejects.toThrow("16");
    await expect(
      previewCampaign(env, { ...canary, notification_id: "f".repeat(16) }, { now }),
    ).rejects.toThrow("not found");
  });

  it("returns aggregates only, replays the same campaign, and cancels idempotently", async () => {
    await env.PUSH_DB.prepare(
      `INSERT INTO push_campaigns (
        campaign_id, environment, topic, kind, title, body, announcement_id,
        audience_mode, preview_digest, status, created_at, accepted_count
      ) VALUES ('campaign-ops', 'development', 'new_printers', 'new_printer',
        'Title', 'Body', 'announcement', 'canary', 'digest', 'blocked', ?, 2)`,
    ).bind(now).run();
    await env.PUSH_DB.prepare(
      `INSERT INTO push_replay_cursors (
        cursor_id, campaign_id, cursor_json, reason, status, created_at
      ) VALUES ('cursor-1', 'campaign-ops', ?, 'provider_auth', 'preserved', ?)`,
    ).bind(
      JSON.stringify({ schema_version: 1, campaign_id: "campaign-ops", environment: "development", after_token_hash: null }),
      now,
    ).run();
    const status = await campaignStatus(env, "campaign-ops");
    expect(status).toMatchObject({ campaign_id: "campaign-ops", accepted_count: 2 });
    expect(JSON.stringify(status)).not.toMatch(/token_hash|ciphertext/);

    const send = vi.fn(async () => undefined);
    await replayCampaignCursor({ ...env, PUSH_FANOUT: { send } }, "campaign-ops", { now: now + 1 });
    expect(send.mock.calls[0][0].campaign_id).toBe("campaign-ops");
    await expect(cancelCampaign(env, "campaign-ops", { now: now + 2 })).resolves.toMatchObject({ status: "cancelled" });
    await expect(cancelCampaign(env, "campaign-ops", { now: now + 3 })).resolves.toMatchObject({ status: "cancelled" });
  });

  it("restores blocked when no replay cursor could be enqueued", async () => {
    await env.PUSH_DB.prepare(
      `INSERT INTO push_campaigns (
        campaign_id, environment, topic, kind, title, body, announcement_id,
        audience_mode, preview_digest, status, blocked_reason, created_at
      ) VALUES ('campaign-stall', 'development', 'new_printers', 'new_printer',
        'Title', 'Body', 'announcement', 'canary', 'digest', 'blocked',
        'provider_auth', ?)`,
    ).bind(now).run();
    await env.PUSH_DB.prepare(
      `INSERT INTO push_replay_cursors (
        cursor_id, campaign_id, cursor_json, reason, status, created_at
      ) VALUES ('cursor-stall', 'campaign-stall', ?, 'provider_auth', 'preserved', ?)`,
    ).bind(
      JSON.stringify({ schema_version: 1, campaign_id: "campaign-stall", environment: "development", after_token_hash: null }),
      now,
    ).run();

    const send = vi.fn(async () => { throw new Error("queue unavailable"); });
    await expect(
      replayCampaignCursor({ ...env, PUSH_FANOUT: { send } }, "campaign-stall", { now: now + 1 }),
    ).rejects.toThrow("queue unavailable");
    const campaign = await env.PUSH_DB.prepare(
      "SELECT status, blocked_reason FROM push_campaigns WHERE campaign_id = 'campaign-stall'",
    ).first();
    expect(campaign.status).toBe("blocked");
    expect(campaign.blocked_reason).toBe("replay_incomplete");
    expect(
      await env.PUSH_DB.prepare(
        "SELECT status FROM push_replay_cursors WHERE cursor_id = 'cursor-stall'",
      ).first("status"),
    ).toBe("preserved");
  });
});
