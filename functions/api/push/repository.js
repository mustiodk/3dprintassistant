import { encryptToken, hashToken, notificationIdForHash } from "./crypto.js";

export class AmbiguousNotificationIdError extends Error {
  constructor() {
    super("notification id is ambiguous");
    this.name = "AmbiguousNotificationIdError";
  }
}

export async function registerDevice(
  env,
  input,
  { keyBytes, now = Math.floor(Date.now() / 1000) },
) {
  const tokenHash = await hashToken(input.tokenHex);
  const encrypted = await encryptToken(input.tokenHex, keyBytes);
  const statements = [
    env.PUSH_DB.prepare(
      `INSERT INTO push_devices (
        environment, token_hash, token_ciphertext, token_iv,
        encryption_key_version, topics, app_version, build_number,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(environment, token_hash) DO UPDATE SET
        token_ciphertext = excluded.token_ciphertext,
        token_iv = excluded.token_iv,
        encryption_key_version = excluded.encryption_key_version,
        topics = excluded.topics,
        app_version = excluded.app_version,
        build_number = excluded.build_number,
        updated_at = excluded.updated_at`,
    ).bind(
      input.environment,
      tokenHash,
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.keyVersion,
      input.topicsMask,
      input.appVersion,
      input.buildNumber,
      now,
      now,
    ),
  ];

  if (input.previousTokenHex && input.previousTokenHex !== input.tokenHex) {
    const previousHash = await hashToken(input.previousTokenHex);
    statements.push(
      env.PUSH_DB.prepare(
        `UPDATE push_deliveries
         SET status = 'token_rotated', updated_at = ?
         WHERE environment = ? AND token_hash = ?
           AND status IN ('pending', 'retryable')`,
      ).bind(now, input.environment, previousHash),
      env.PUSH_DB.prepare(
        "DELETE FROM push_devices WHERE environment = ? AND token_hash = ?",
      ).bind(input.environment, previousHash),
    );
  }

  await env.PUSH_DB.batch(statements);
  return { notificationId: notificationIdForHash(tokenHash), topics: input.topicsMask };
}

export async function unregisterDevice(env, input) {
  const tokenHash = await hashToken(input.tokenHex);
  const results = await env.PUSH_DB.batch([
    env.PUSH_DB.prepare(
      "DELETE FROM push_deliveries WHERE environment = ? AND token_hash = ?",
    ).bind(input.environment, tokenHash),
    env.PUSH_DB.prepare(
      "DELETE FROM push_devices WHERE environment = ? AND token_hash = ?",
    ).bind(input.environment, tokenHash),
  ]);
  return { removed: Number(results[1].meta.changes ?? 0) > 0 };
}

export async function resolveNotificationId(database, prefix, environment) {
  if (!/^[0-9a-f]{16}$/.test(prefix)) {
    throw new Error("notification id must contain 16 lowercase hex characters");
  }
  const query = environment
    ? database
        .prepare(
          `SELECT environment, token_hash, token_ciphertext, token_iv,
                  encryption_key_version, topics
           FROM push_devices
           WHERE environment = ? AND token_hash LIKE ?
           ORDER BY token_hash LIMIT 2`,
        )
        .bind(environment, `${prefix}%`)
    : database
        .prepare(
          `SELECT environment, token_hash, token_ciphertext, token_iv,
                  encryption_key_version, topics
           FROM push_devices
           WHERE token_hash LIKE ?
           ORDER BY environment, token_hash LIMIT 2`,
        )
        .bind(`${prefix}%`);
  const result = await query.all();
  if (result.results.length > 1) throw new AmbiguousNotificationIdError();
  return result.results[0] ?? null;
}
