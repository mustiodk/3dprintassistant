#!/usr/bin/env node

import { execFile as execFileCallback } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFile = promisify(execFileCallback);
const DEFAULT_API_BASE = "https://3dprintassistant.com/api/push/admin";
const TERMINAL_STATUSES = new Set([
  "complete",
  "partial",
  "blocked",
  "cancelled",
  "failed",
]);

export function assertNoSecretArguments(args) {
  if (args.some((argument) => /--?(?:token|secret|key|authorization)(?:=|$)/i.test(argument))) {
    throw new Error("Secret arguments are forbidden; use .push-admin.env or macOS Keychain");
  }
}

export function parseTokenFile(contents, mode) {
  if ((mode & 0o077) !== 0) {
    throw new Error(".push-admin.env must have mode 0600");
  }
  const match = /^PUSH_ADMIN_TOKEN=(.+)$/m.exec(contents);
  if (!match || match[1].trim().length === 0) {
    throw new Error(".push-admin.env does not contain PUSH_ADMIN_TOKEN");
  }
  return match[1].trim().replace(/^(['"])(.*)\1$/, "$2");
}

export function redactNotificationId(value) {
  return typeof value === "string" && value.length >= 4 ? `…${value.slice(-4)}` : null;
}

async function loadAdminToken() {
  const envPath = path.join(process.cwd(), ".push-admin.env");
  try {
    await access(envPath, fsConstants.R_OK);
    const [contents, metadata] = await Promise.all([readFile(envPath, "utf8"), stat(envPath)]);
    return parseTokenFile(contents, metadata.mode);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  try {
    const { stdout } = await execFile("security", [
      "find-generic-password",
      "-s",
      "3dpa-push-admin",
      "-a",
      "PUSH_ADMIN_TOKEN",
      "-w",
    ]);
    const token = stdout.trim();
    if (!token) throw new Error("empty Keychain value");
    return token;
  } catch {
    throw new Error(
      "PUSH_ADMIN_TOKEN is unavailable; create mode-0600 .push-admin.env or the 3dpa-push-admin Keychain item",
    );
  }
}

async function requestJSON(relativePath, { token, method = "GET", body } = {}) {
  const base = (process.env.PUSH_API_BASE_URL || DEFAULT_API_BASE).replace(/\/$/, "");
  const response = await fetch(`${base}${relativePath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = { error: `HTTP ${response.status}` };
  }
  if (!response.ok) {
    throw new Error(`Push API rejected the request: ${payload.error || response.status}`);
  }
  return payload;
}

async function readDraft(filePath) {
  if (!filePath) throw new Error("A campaign JSON file is required");
  const parsed = JSON.parse(await readFile(path.resolve(filePath), "utf8"));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Campaign JSON must contain one object");
  }
  return parsed;
}

function safeSummary(payload, notificationId) {
  const allowed = [
    "campaign_id",
    "environment",
    "audience_mode",
    "matching_count",
    "preview_digest",
    "payload_bytes",
    "topic",
    "kind",
    "status",
    "blocked_reason",
    "created_at",
    "started_at",
    "completed_at",
    "accepted_count",
    "consent_removed_count",
    "token_rotated_count",
    "invalid_count",
    "failed_count",
  ];
  const summary = Object.fromEntries(
    allowed.filter((key) => payload[key] !== undefined).map((key) => [key, payload[key]]),
  );
  const redacted = redactNotificationId(notificationId);
  if (redacted) summary.notification_id = redacted;
  return summary;
}

function printSummary(payload, notificationId) {
  process.stdout.write(`${JSON.stringify(safeSummary(payload, notificationId), null, 2)}\n`);
}

async function previewDraft(token, draft) {
  const previewBody = { ...draft };
  delete previewBody.confirm_campaign_id;
  delete previewBody.confirm_preview_digest;
  return requestJSON("/campaigns", { token, method: "POST", body: previewBody });
}

async function confirmCampaignId(campaignId) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Public send confirmation requires an interactive terminal");
  }
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question(`Type the exact campaign id (${campaignId}) to send: `);
    if (answer !== campaignId) throw new Error("Campaign confirmation did not match");
  } finally {
    prompt.close();
  }
}

async function pollStatus(token, campaignId, { attempts = 30, intervalMs = 2000 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const status = await requestJSON(`/campaigns/${encodeURIComponent(campaignId)}`, { token });
    printSummary(status);
    if (TERMINAL_STATUSES.has(status.status)) return status;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Campaign status polling timed out");
}

async function submitDraft(token, draft, requireInteractiveConfirmation) {
  const preview = await previewDraft(token, draft);
  printSummary(preview, draft.notification_id);
  if (requireInteractiveConfirmation) await confirmCampaignId(draft.campaign_id);
  const created = await requestJSON("/campaigns", {
    token,
    method: "POST",
    body: {
      ...draft,
      confirm_campaign_id: draft.campaign_id,
      confirm_preview_digest: preview.preview_digest,
    },
  });
  printSummary(created, draft.notification_id);
  return pollStatus(token, draft.campaign_id);
}

function usage() {
  return [
    "Usage:",
    "  node scripts/send-ios-push.mjs preview <campaign.json>",
    "  node scripts/send-ios-push.mjs canary <campaign.json>",
    "  node scripts/send-ios-push.mjs send <campaign.json>",
    "  node scripts/send-ios-push.mjs status <campaign-id>",
    "  node scripts/send-ios-push.mjs cancel <campaign-id>",
    "  node scripts/send-ios-push.mjs replay <campaign-id>",
  ].join("\n");
}

export async function main(args = process.argv.slice(2)) {
  assertNoSecretArguments(args);
  const [command, target, ...extra] = args;
  if (!command || !target || extra.length > 0) throw new Error(usage());
  const token = await loadAdminToken();

  if (command === "preview") {
    const draft = await readDraft(target);
    printSummary(await previewDraft(token, draft), draft.notification_id);
    return;
  }
  if (command === "canary" || command === "send") {
    const draft = await readDraft(target);
    if (command === "canary" && draft.audience_mode !== "canary") {
      throw new Error("canary requires audience_mode=canary");
    }
    if (command === "send" && draft.audience_mode !== "public") {
      throw new Error("send requires audience_mode=public");
    }
    await submitDraft(token, draft, command === "send");
    return;
  }
  if (command === "status") {
    printSummary(await requestJSON(`/campaigns/${encodeURIComponent(target)}`, { token }));
    return;
  }
  if (command === "cancel" || command === "replay") {
    const result = await requestJSON(
      `/campaigns/${encodeURIComponent(target)}/${command}`,
      { token, method: "POST" },
    );
    printSummary(result);
    await pollStatus(token, target);
    return;
  }
  throw new Error(usage());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
