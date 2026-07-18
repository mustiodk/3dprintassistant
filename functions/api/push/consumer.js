import { createAPNsClient } from "./apns.js";
import { buildCampaignPayload } from "./campaigns.js";
import { decodeEncryptionKey, decryptToken } from "./crypto.js";

const PAGE_SIZE = 100;
const DEFAULT_CONCURRENCY = 10;
const RETRY_LIMIT = 5;

function validateCursor(cursor) {
  if (
    cursor?.schema_version !== 1 ||
    typeof cursor.campaign_id !== "string" ||
    !new Set(["development", "production"]).has(cursor.environment) ||
    !(
      cursor.after_token_hash === null ||
      /^[0-9a-f]{64}$/.test(cursor.after_token_hash)
    )
  ) {
    throw new Error("invalid push queue cursor");
  }
  return {
    schema_version: 1,
    campaign_id: cursor.campaign_id,
    environment: cursor.environment,
    after_token_hash: cursor.after_token_hash,
  };
}

async function getCampaign(database, campaignId) {
  return database
    .prepare("SELECT * FROM push_campaigns WHERE campaign_id = ?")
    .bind(campaignId)
    .first();
}

async function campaignIsCancelled(database, campaignId) {
  const status = await database
    .prepare("SELECT status FROM push_campaigns WHERE campaign_id = ?")
    .bind(campaignId)
    .first("status");
  return status === "cancelled";
}

async function pageDeliveryHashes(database, cursor) {
  const after = cursor.after_token_hash ?? "";
  return database
    .prepare(
      `SELECT token_hash FROM push_deliveries
       WHERE campaign_id = ? AND environment = ? AND token_hash > ?
         AND status IN ('pending', 'retryable')
       ORDER BY token_hash
       LIMIT ?`,
    )
    .bind(cursor.campaign_id, cursor.environment, after, PAGE_SIZE)
    .all();
}

async function currentDelivery(database, cursor, tokenHash) {
  return database
    .prepare(
      `SELECT d.status, d.attempts, p.token_ciphertext, p.token_iv,
              p.encryption_key_version
       FROM push_deliveries d
       LEFT JOIN push_devices p
         ON p.environment = d.environment AND p.token_hash = d.token_hash
       WHERE d.campaign_id = ? AND d.environment = ? AND d.token_hash = ?`,
    )
    .bind(cursor.campaign_id, cursor.environment, tokenHash)
    .first();
}

async function transitionDelivery(database, cursor, tokenHash, status, apnsStatus, now) {
  return database
    .prepare(
      `UPDATE push_deliveries
       SET status = ?, attempts = attempts + 1, last_apns_status = ?, updated_at = ?
       WHERE campaign_id = ? AND environment = ? AND token_hash = ?
         AND status IN ('pending', 'retryable')`,
    )
    .bind(
      status,
      apnsStatus === null ? null : String(apnsStatus),
      now,
      cursor.campaign_id,
      cursor.environment,
      tokenHash,
    )
    .run();
}

async function markMissingConsent(database, cursor, tokenHash, now) {
  return database
    .prepare(
      `UPDATE push_deliveries
       SET status = 'consent_removed', updated_at = ?
       WHERE campaign_id = ? AND environment = ? AND token_hash = ?
         AND status IN ('pending', 'retryable')`,
    )
    .bind(now, cursor.campaign_id, cursor.environment, tokenHash)
    .run();
}

async function processDelivery({
  env,
  campaign,
  cursor,
  tokenHash,
  apnsClient,
  keyBytes,
  now,
}) {
  if (await campaignIsCancelled(env.PUSH_DB, cursor.campaign_id)) {
    return { classification: "cancelled" };
  }
  const delivery = await currentDelivery(env.PUSH_DB, cursor, tokenHash);
  if (!delivery || !new Set(["pending", "retryable"]).has(delivery.status)) {
    return { classification: "skipped" };
  }
  if (delivery.token_ciphertext === null) {
    await markMissingConsent(env.PUSH_DB, cursor, tokenHash, now);
    return { classification: "consent_removed" };
  }
  if (delivery.encryption_key_version !== 1) {
    throw new Error("unsupported push token encryption key version");
  }
  const tokenHex = await decryptToken(
    { ciphertext: delivery.token_ciphertext, iv: delivery.token_iv },
    keyBytes,
  );
  if (await campaignIsCancelled(env.PUSH_DB, cursor.campaign_id)) {
    return { classification: "cancelled" };
  }

  const result = await apnsClient.send({
    credentials: {
      keyId: env.APNS_KEY_ID,
      teamId: env.APNS_TEAM_ID,
      privateKeyPEM: env.APNS_PRIVATE_KEY_P8,
      topic: env.APNS_TOPIC,
    },
    environment: cursor.environment,
    tokenHex,
    payload: buildCampaignPayload(campaign),
  });
  if (result.classification === "blocked") return result;
  if (result.classification === "accepted") {
    const update = await transitionDelivery(
      env.PUSH_DB,
      cursor,
      tokenHash,
      "apns_accepted",
      result.status,
      now,
    );
    if (Number(update.meta.changes ?? 0) > 0) {
      await env.PUSH_DB.prepare(
        `UPDATE push_devices SET last_apns_success_at = ?
         WHERE environment = ? AND token_hash = ?`,
      ).bind(now, cursor.environment, tokenHash).run();
    }
  } else if (result.classification === "invalid") {
    await transitionDelivery(
      env.PUSH_DB,
      cursor,
      tokenHash,
      "invalid",
      result.status,
      now,
    );
    await env.PUSH_DB.prepare(
      "DELETE FROM push_devices WHERE environment = ? AND token_hash = ?",
    ).bind(cursor.environment, tokenHash).run();
  } else if (result.classification === "retryable") {
    await transitionDelivery(
      env.PUSH_DB,
      cursor,
      tokenHash,
      "retryable",
      result.status,
      now,
    );
  } else {
    await transitionDelivery(
      env.PUSH_DB,
      cursor,
      tokenHash,
      "failed",
      result.status,
      now,
    );
  }
  return result;
}

async function preserveCursor(env, cursor, reason, now) {
  await env.PUSH_DB.batch([
    env.PUSH_DB.prepare(
      `INSERT INTO push_replay_cursors (
        cursor_id, campaign_id, cursor_json, reason, status, created_at
      ) VALUES (?, ?, ?, ?, 'preserved', ?)`,
    ).bind(crypto.randomUUID(), cursor.campaign_id, JSON.stringify(cursor), reason, now),
    env.PUSH_DB.prepare(
      `UPDATE push_campaigns
       SET status = 'blocked', blocked_reason = ?
       WHERE campaign_id = ? AND status != 'cancelled'`,
    ).bind(reason, cursor.campaign_id),
  ]);
  await env.PUSH_DLQ.send(cursor);
}

async function finishCampaign(database, campaignId, now) {
  const pending = Number(
    await database
      .prepare(
        `SELECT COUNT(*) AS count FROM push_deliveries
         WHERE campaign_id = ? AND status IN ('pending', 'retryable')`,
      )
      .bind(campaignId)
      .first("count"),
  );
  if (pending > 0) return;
  const counts = await database
    .prepare(
      `SELECT accepted_count, invalid_count, failed_count
       FROM push_campaigns WHERE campaign_id = ?`,
    )
    .bind(campaignId)
    .first();
  let status = "complete";
  if (counts.failed_count > 0 && counts.accepted_count === 0) status = "failed";
  else if (counts.failed_count > 0 || counts.invalid_count > 0) status = "partial";
  await database
    .prepare(
      `UPDATE push_campaigns SET status = ?, completed_at = ?
       WHERE campaign_id = ? AND status = 'sending'`,
    )
    .bind(status, now, campaignId)
    .run();
}

async function processMessage(
  message,
  env,
  { apnsClient, now, concurrency },
) {
  const cursor = validateCursor(message.body);
  let campaign = await getCampaign(env.PUSH_DB, cursor.campaign_id);
  if (!campaign || campaign.environment !== cursor.environment) {
    message.ack();
    return;
  }
  if (!new Set(["queued", "sending"]).has(campaign.status)) {
    message.ack();
    return;
  }
  await env.PUSH_DB.prepare(
    `UPDATE push_campaigns SET status = 'sending', started_at = COALESCE(started_at, ?)
     WHERE campaign_id = ? AND status = 'queued'`,
  ).bind(now(), cursor.campaign_id).run();
  campaign = await getCampaign(env.PUSH_DB, cursor.campaign_id);
  const page = await pageDeliveryHashes(env.PUSH_DB, cursor);
  const keyBytes = decodeEncryptionKey(env.PUSH_TOKEN_ENCRYPTION_KEY_V1);
  let nextIndex = 0;
  let halted = null;
  let sawRetryable = false;

  const runOne = async () => {
    while (halted === null) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= page.results.length) return;
      const outcome = await processDelivery({
        env,
        campaign,
        cursor,
        tokenHash: page.results[index].token_hash,
        apnsClient,
        keyBytes,
        now: now(),
      });
      if (outcome.classification === "blocked" || outcome.classification === "cancelled") {
        halted = outcome.classification;
        return;
      }
      if (outcome.classification === "retryable") sawRetryable = true;
    }
  };

  // A single provider-auth sentinel prevents a broken credential from fanning
  // out before the bounded-concurrency workers start.
  if (page.results.length > 0) await runOne();
  if (halted === null) {
    await Promise.all(
      Array.from(
        { length: Math.min(concurrency, Math.max(0, page.results.length - 1)) },
        () => runOne(),
      ),
    );
  }

  if (halted === "blocked") {
    await preserveCursor(env, cursor, "provider_auth", now());
    message.ack();
    return;
  }
  if (halted === "cancelled") {
    message.ack();
    return;
  }
  if (sawRetryable) {
    if (Number(message.attempts ?? 1) >= RETRY_LIMIT) {
      await preserveCursor(env, cursor, "retry_exhausted", now());
      message.ack();
    } else {
      const delaySeconds = Math.min(30 * 2 ** Number(message.attempts ?? 1), 3600);
      message.retry({ delaySeconds });
    }
    return;
  }
  if (page.results.length === PAGE_SIZE) {
    await env.PUSH_FANOUT.send({
      ...cursor,
      after_token_hash: page.results.at(-1).token_hash,
    });
  } else {
    await finishCampaign(env.PUSH_DB, cursor.campaign_id, now());
  }
  message.ack();
}

export async function processQueueBatch(
  batch,
  env,
  _ctx,
  {
    apnsClient = createAPNsClient(),
    now = () => Math.floor(Date.now() / 1000),
    concurrency = DEFAULT_CONCURRENCY,
  } = {},
) {
  for (const message of batch.messages) {
    try {
      await processMessage(message, env, {
        apnsClient,
        now,
        concurrency: Math.max(1, Math.min(DEFAULT_CONCURRENCY, concurrency)),
      });
    } catch {
      message.retry({ delaySeconds: 60 });
    }
  }
}
