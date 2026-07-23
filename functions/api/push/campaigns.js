import { constantTimeEqual } from "./auth.js";
import { resolveNotificationId } from "./repository.js";

const encoder = new TextEncoder();
const CAMPAIGN_FIELDS = new Set([
  "schema_version",
  "campaign_id",
  "environment",
  "topic",
  "kind",
  "title",
  "body",
  "brand_id",
  "printer_id",
  "release_version",
  "announcement_id",
  "audience_mode",
  "notification_id",
  "confirm_campaign_id",
  "confirm_preview_digest",
]);
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const VERSION_PATTERN = /^[0-9]+(?:\.[0-9]+){1,3}$/;
const ENVIRONMENTS = new Set(["development", "production"]);

export class CampaignError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "CampaignError";
    this.status = status;
  }
}

function requiredString(value, field, maxLength) {
  if (typeof value !== "string" || value.length < 1 || value.length > maxLength) {
    throw new CampaignError(`${field} is invalid`);
  }
  return value;
}

function requiredId(value, field) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    throw new CampaignError(`${field} is invalid`);
  }
  return value;
}

function assertAllowedFields(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new CampaignError("campaign must be a JSON object");
  }
  for (const field of Object.keys(input)) {
    if (!CAMPAIGN_FIELDS.has(field)) throw new CampaignError(`${field} is not allowed`);
  }
}

export function buildCampaignPayload(campaign) {
  const payload = {
    aps: {
      alert: { title: campaign.title, body: campaign.body },
      sound: "default",
      "thread-id":
        campaign.kind === "new_printer"
          ? "3dpa-new-printers"
          : "3dpa-app-updates",
    },
    schema_version: 1,
    announcement_id: campaign.announcement_id,
    kind: campaign.kind,
    ...(campaign.kind === "new_printer"
      ? { brand_id: campaign.brand_id, printer_id: campaign.printer_id }
      : { release_version: campaign.release_version }),
  };
  if (encoder.encode(JSON.stringify(payload)).byteLength >= 4096) {
    throw new CampaignError("APNs payload must be below 4096 bytes");
  }
  return payload;
}

export function validateCampaignDraft(input) {
  assertAllowedFields(input);
  if (input.schema_version !== 1) throw new CampaignError("schema_version must be 1");
  const campaign = {
    schema_version: 1,
    campaign_id: requiredId(input.campaign_id, "campaign_id"),
    environment: input.environment,
    topic: input.topic,
    kind: input.kind,
    title: requiredString(input.title, "title", 60),
    body: requiredString(input.body, "body", 180),
    announcement_id: requiredId(input.announcement_id, "announcement_id"),
    audience_mode: input.audience_mode,
  };
  if (!ENVIRONMENTS.has(campaign.environment)) {
    throw new CampaignError("environment is invalid");
  }
  if (!new Set(["canary", "public"]).has(campaign.audience_mode)) {
    throw new CampaignError("audience_mode is invalid");
  }

  if (campaign.kind === "new_printer") {
    if (campaign.topic !== "new_printers") {
      throw new CampaignError("topic must be new_printers for new_printer");
    }
    campaign.brand_id = requiredId(input.brand_id, "brand_id");
    campaign.printer_id = requiredId(input.printer_id, "printer_id");
    if (input.release_version !== undefined) {
      throw new CampaignError("release_version is not allowed for new_printer");
    }
  } else if (campaign.kind === "app_update") {
    if (campaign.topic !== "app_updates") {
      throw new CampaignError("topic must be app_updates for app_update");
    }
    if (input.brand_id !== undefined || input.printer_id !== undefined) {
      throw new CampaignError("brand_id/printer_id are not allowed for app_update");
    }
    if (
      typeof input.release_version !== "string" ||
      !VERSION_PATTERN.test(input.release_version) ||
      input.release_version.length > 32
    ) {
      throw new CampaignError("release_version is invalid");
    }
    campaign.release_version = input.release_version;
  } else {
    throw new CampaignError("kind is invalid");
  }

  if (campaign.audience_mode === "canary") {
    if (typeof input.notification_id !== "string" || !/^[0-9a-f]{16}$/.test(input.notification_id)) {
      throw new CampaignError("notification_id must contain exactly 16 lowercase hex characters");
    }
    campaign.notification_id = input.notification_id;
  } else if (input.notification_id !== undefined) {
    throw new CampaignError("notification_id is only allowed for canary campaigns");
  }

  return { ...campaign, payload: buildCampaignPayload(campaign) };
}

async function sha256Hex(value) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function digestInput(campaign) {
  return JSON.stringify({
    schema_version: campaign.schema_version,
    campaign_id: campaign.campaign_id,
    environment: campaign.environment,
    topic: campaign.topic,
    kind: campaign.kind,
    title: campaign.title,
    body: campaign.body,
    brand_id: campaign.brand_id ?? null,
    printer_id: campaign.printer_id ?? null,
    release_version: campaign.release_version ?? null,
    announcement_id: campaign.announcement_id,
    audience_mode: campaign.audience_mode,
    notification_id: campaign.notification_id ?? null,
  });
}

async function computePreview(env, input) {
  const campaign = validateCampaignDraft(input);
  let targetHash = null;
  let matchingCount;
  if (campaign.audience_mode === "canary") {
    const target = await resolveNotificationId(env.PUSH_DB, campaign.notification_id);
    if (!target) throw new CampaignError("notification_id was not found", 404);
    if (target.environment !== campaign.environment) {
      throw new CampaignError("notification_id does not match environment", 409);
    }
    if ((target.topics & (campaign.topic === "new_printers" ? 1 : 2)) === 0) {
      throw new CampaignError("notification_id has not consented to this topic", 409);
    }
    targetHash = target.token_hash;
    matchingCount = 1;
  } else {
    const topicMask = campaign.topic === "new_printers" ? 1 : 2;
    matchingCount = Number(
      await env.PUSH_DB.prepare(
        `SELECT COUNT(*) AS count FROM push_devices
         WHERE environment = ? AND (topics & ?) != 0`,
      ).bind(campaign.environment, topicMask).first("count"),
    );
  }
  const previewDigest = await sha256Hex(digestInput(campaign));
  return { campaign, targetHash, matchingCount, previewDigest };
}

export async function previewCampaign(env, input) {
  const preview = await computePreview(env, input);
  return {
    campaign_id: preview.campaign.campaign_id,
    environment: preview.campaign.environment,
    audience_mode: preview.campaign.audience_mode,
    matching_count: preview.matchingCount,
    preview_digest: preview.previewDigest,
    payload_bytes: encoder.encode(JSON.stringify(preview.campaign.payload)).byteLength,
  };
}

export async function authorizeAdmin(request, env, compare = constantTimeEqual) {
  const expected = env.PUSH_ADMIN_TOKEN;
  const match = /^Bearer ([^\s]+)$/.exec(request.headers.get("Authorization") ?? "");
  if (typeof expected !== "string" || expected.length === 0 || !match) {
    throw new CampaignError("admin authentication failed", 401);
  }
  if (!(await compare(match[1], expected))) {
    throw new CampaignError("admin authentication failed", 401);
  }
}

export async function createCampaign(env, input, { now = Math.floor(Date.now() / 1000) } = {}) {
  const preview = await computePreview(env, input);
  if (
    input.confirm_campaign_id !== preview.campaign.campaign_id ||
    input.confirm_preview_digest !== preview.previewDigest
  ) {
    throw new CampaignError("campaign confirmation does not match preview", 409);
  }
  if (
    preview.campaign.audience_mode === "public" &&
    env.PUSH_PUBLIC_SEND_ENABLED !== "true"
  ) {
    throw new CampaignError("public push send is disabled", 503);
  }
  const campaign = preview.campaign;
  // The rolling-seven-days public cadence is enforced atomically inside the
  // campaign INSERT (WHERE NOT EXISTS), not by a separate pre-read, so two
  // concurrent creates can never both pass a check-then-insert window. The
  // deliveries INSERT is conditioned on the campaign row existing so a
  // cadence-rejected batch inserts nothing instead of aborting on the FK.
  const campaignColumns = `campaign_id, environment, topic, kind, title, body,
      brand_id, printer_id, release_version, announcement_id, audience_mode,
      preview_digest, status, created_at`;
  const campaignValues = [
    campaign.campaign_id,
    campaign.environment,
    campaign.topic,
    campaign.kind,
    campaign.title,
    campaign.body,
    campaign.brand_id ?? null,
    campaign.printer_id ?? null,
    campaign.release_version ?? null,
    campaign.announcement_id,
    campaign.audience_mode,
    preview.previewDigest,
    now,
  ];
  const insertCampaign =
    campaign.audience_mode === "public"
      ? env.PUSH_DB.prepare(
          `INSERT INTO push_campaigns (${campaignColumns})
           SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?
           WHERE NOT EXISTS (
             SELECT 1 FROM push_campaigns
             WHERE audience_mode = 'public' AND status != 'cancelled'
               AND created_at > ?
           )`,
        ).bind(...campaignValues, now - 7 * 86_400)
      : env.PUSH_DB.prepare(
          `INSERT INTO push_campaigns (${campaignColumns})
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?)`,
        ).bind(...campaignValues);
  const topicMask = campaign.topic === "new_printers" ? 1 : 2;
  const campaignExists =
    "EXISTS (SELECT 1 FROM push_campaigns WHERE campaign_id = ?)";
  const insertDeliveries = preview.targetHash
    ? env.PUSH_DB.prepare(
        `INSERT INTO push_deliveries (
          campaign_id, environment, token_hash, status, attempts, updated_at
        )
        SELECT ?, ?, ?, 'pending', 0, ?
        WHERE ${campaignExists}`,
      ).bind(
        campaign.campaign_id,
        campaign.environment,
        preview.targetHash,
        now,
        campaign.campaign_id,
      )
    : env.PUSH_DB.prepare(
        `INSERT INTO push_deliveries (
          campaign_id, environment, token_hash, status, attempts, updated_at
        )
        SELECT ?, environment, token_hash, 'pending', 0, ?
        FROM push_devices
        WHERE environment = ? AND (topics & ?) != 0
          AND ${campaignExists}`,
      ).bind(
        campaign.campaign_id,
        now,
        campaign.environment,
        topicMask,
        campaign.campaign_id,
      );
  let results;
  try {
    results = await env.PUSH_DB.batch([insertCampaign, insertDeliveries]);
  } catch (error) {
    // Concurrent duplicate create: the PRIMARY KEY aborts the batch atomically.
    if (String(error?.message ?? error).includes("UNIQUE constraint failed")) {
      throw new CampaignError("campaign_id already exists", 409);
    }
    throw error;
  }
  if (Number(results[0].meta.changes ?? 0) === 0) {
    const duplicate = await env.PUSH_DB.prepare(
      "SELECT campaign_id FROM push_campaigns WHERE campaign_id = ?",
    ).bind(campaign.campaign_id).first();
    if (duplicate) throw new CampaignError("campaign_id already exists", 409);
    throw new CampaignError(
      "one public campaign is allowed per rolling seven days",
      409,
    );
  }
  const cursor = {
    schema_version: 1,
    campaign_id: campaign.campaign_id,
    environment: campaign.environment,
    after_token_hash: null,
  };
  try {
    await env.PUSH_FANOUT.send(cursor);
  } catch (error) {
    await env.PUSH_DB.prepare(
      "UPDATE push_campaigns SET status = 'failed', completed_at = ? WHERE campaign_id = ?",
    ).bind(now, campaign.campaign_id).run();
    throw error;
  }
  return { campaign_id: campaign.campaign_id, status: "queued" };
}

export async function campaignStatus(env, campaignId) {
  const row = await env.PUSH_DB.prepare(
    `SELECT campaign_id, environment, topic, kind, audience_mode, status,
            blocked_reason, created_at, started_at, completed_at,
            accepted_count, consent_removed_count, token_rotated_count,
            invalid_count, failed_count
     FROM push_campaigns WHERE campaign_id = ?`,
  ).bind(campaignId).first();
  if (!row) throw new CampaignError("campaign was not found", 404);
  return row;
}

export async function cancelCampaign(env, campaignId, { now = Math.floor(Date.now() / 1000) } = {}) {
  const existing = await campaignStatus(env, campaignId);
  if (existing.status === "cancelled") return existing;
  await env.PUSH_DB.batch([
    env.PUSH_DB.prepare(
      `UPDATE push_campaigns
       SET status = 'cancelled', completed_at = COALESCE(completed_at, ?)
       WHERE campaign_id = ? AND status IN ('queued', 'sending', 'blocked')`,
    ).bind(now, campaignId),
    env.PUSH_DB.prepare(
      `UPDATE push_replay_cursors
       SET status = 'cancelled'
       WHERE campaign_id = ? AND status = 'preserved'`,
    ).bind(campaignId),
  ]);
  return campaignStatus(env, campaignId);
}

export async function replayCampaignCursor(
  env,
  campaignId,
  { now = Math.floor(Date.now() / 1000) } = {},
) {
  const campaign = await campaignStatus(env, campaignId);
  const cursors = await env.PUSH_DB.prepare(
    `SELECT cursor_id, cursor_json FROM push_replay_cursors
     WHERE campaign_id = ? AND status = 'preserved'
     ORDER BY created_at, cursor_id`,
  ).bind(campaignId).all();
  const cursorFields = new Set([
    "schema_version",
    "campaign_id",
    "environment",
    "after_token_hash",
  ]);
  const validatedCursors = cursors.results.map((row) => {
    const cursor = JSON.parse(row.cursor_json);
    if (
      cursor === null ||
      typeof cursor !== "object" ||
      Array.isArray(cursor) ||
      Object.keys(cursor).some((field) => !cursorFields.has(field)) ||
      cursor.schema_version !== 1 ||
      cursor.campaign_id !== campaignId ||
      cursor.environment !== campaign.environment ||
      !(
        cursor.after_token_hash === null ||
        /^[0-9a-f]{64}$/.test(cursor.after_token_hash)
      )
    ) {
      throw new CampaignError("replay cursor does not match campaign", 409);
    }
    return { row, cursor };
  });
  // The campaign must be consumable before any replayed message can land, so
  // 'queued' is set ahead of the sends. If a send then fails before ANY cursor
  // was enqueued, restore 'blocked' with an explicit reason — otherwise a
  // 'queued' campaign with zero in-flight messages would stall silently. After
  // partial progress the campaign stays 'queued' (in-flight work exists) and
  // the thrown error tells the operator to replay the remaining cursors.
  await env.PUSH_DB.prepare(
    `UPDATE push_campaigns SET status = 'queued', blocked_reason = NULL,
      completed_at = NULL WHERE campaign_id = ? AND status = 'blocked'`,
  ).bind(campaignId).run();
  let enqueued = 0;
  try {
    for (const { row, cursor } of validatedCursors) {
      await env.PUSH_FANOUT.send(cursor);
      enqueued += 1;
      await env.PUSH_DB.prepare(
        `UPDATE push_replay_cursors SET status = 'replayed', replayed_at = ?
         WHERE cursor_id = ? AND status = 'preserved'`,
      ).bind(now, row.cursor_id).run();
    }
  } catch (error) {
    if (enqueued === 0) {
      await env.PUSH_DB.prepare(
        `UPDATE push_campaigns
         SET status = 'blocked', blocked_reason = 'replay_incomplete'
         WHERE campaign_id = ? AND status = 'queued'`,
      ).bind(campaignId).run();
    }
    throw error;
  }
  return campaignStatus(env, campaignId);
}
