# iOS Push Operations Runbook

This runbook is fail-closed. The provider is currently an owner-gated local
implementation. Do not provision, deploy notification bindings, register a
device, or send a notification until G0 is explicitly cleared.

## G0 owner gate

The owner must:

1. enable Push Notifications for the production App ID;
2. create/download a dedicated APNs `.p8` key and provide its key id/team id
   through the approved secret-entry path;
3. approve creation of EU D1, Queue, DLQ, rate-limit binding, and Worker
   secrets;
4. verify the App Store Connect Device ID privacy answer and final privacy
   text.

Never paste a secret into chat, a command argument, a log, or a committed file.

## Owner CLI setup

The only supported send surface is `scripts/send-ios-push.mjs`.

Store the admin token in one of these places:

```bash
touch .push-admin.env
chmod 600 .push-admin.env
# File contains one PUSH_ADMIN_TOKEN assignment; value is entered locally.
```

or macOS Keychain service `3dpa-push-admin`, account `PUSH_ADMIN_TOKEN`. The CLI
rejects secret-like command arguments and prints only aggregates plus the last
four Notification ID characters.

Commands:

```bash
node scripts/send-ios-push.mjs preview campaign.json
node scripts/send-ios-push.mjs canary campaign.json
node scripts/send-ios-push.mjs send campaign.json
node scripts/send-ios-push.mjs status CAMPAIGN_ID
node scripts/send-ios-push.mjs cancel CAMPAIGN_ID
node scripts/send-ios-push.mjs replay CAMPAIGN_ID
```

`send` requires typing the exact campaign id interactively. Canary, send,
cancel, and replay poll aggregate status and stop on a terminal state.

## Provision after G0 only

Run from the web repository with current Wrangler. Capture returned identifiers
without putting them in chat or logs.

```bash
npx wrangler d1 create 3dpa-push-production --jurisdiction=eu
npx wrangler queues create 3dpa-push-production
npx wrangler queues create 3dpa-push-dlq
```

Add only the returned D1 id as `PUSH_DB` in `wrangler.toml`. Queue names and the
developer-assigned rate-limit namespace `11001` are already source-controlled.
Confirm `11001` is unique in the account unless counter sharing is deliberate.

Enter secrets interactively; never use a value as a CLI argument:

```bash
npx wrangler secret put IOS_PUSH_REGISTRATION_SECRET
npx wrangler secret put PUSH_ADMIN_TOKEN
npx wrangler secret put PUSH_TOKEN_ENCRYPTION_KEY_V1
npx wrangler secret put APNS_KEY_ID
npx wrangler secret put APNS_TEAM_ID
npx wrangler secret put APNS_PRIVATE_KEY_P8
```

Apply numbered migrations before the first notification-aware deploy:

```bash
npx wrangler d1 migrations list PUSH_DB --remote
npx wrangler d1 migrations apply PUSH_DB --remote
```

## Dark deployment

Verify configuration before deployment:

```bash
npm test -- --run functions/api/push
npx wrangler deploy --dry-run
```

Deploy with both flags still false:

```toml
PUSH_REGISTRATION_ENABLED = "false"
PUSH_PUBLIC_SEND_ENABLED = "false"
```

After deploy, prove the D1 binding, Queue consumer + explicit DLQ producer,
rate limiter, secrets, and daily `0 3 * * *` Cron all exist. Absence of any one
is a stop. Existing web feedback/analytics and static-asset probes must remain
green.

> **Manual-deploy caveat (2026-07-23).** `wrangler deploy` uploads the entire
> working tree minus `.assetsignore` — including *untracked* local dirs that the
> git-connected `main` deploy never serves (`.superpowers/`, `.worktrees/`,
> `ai-handoffs/` were caught leaking this way and added to `.assetsignore`).
> After any manual deploy, re-probe those internal paths for non-200 too, not
> only `/wrangler.toml`, `/worker.js`, `/functions/**`, `/migrations/**`. Note
> also that a leaked URL, once fetched, is edge-cached until its short TTL
> expires; verify origin with a cache-busting query string.

## Development/TestFlight canary

Keep public send false. Enable registration only after the dark-deploy checks.
Use a development or TestFlight device that explicitly opted in and copy its
in-app Notification ID locally.

1. Preview one `audience_mode=canary` campaign with the exact APNs environment
   and Notification ID.
2. Confirm the preview count is exactly one and inspect the digest/payload size.
3. Run `canary`; require `accepted_count=1` with no blocked/invalid/failed count.
4. Confirm actual device display and tap routing. APNs acceptance alone is not
   receipt proof.
5. Opt out in-app, let unregister confirm, and repeat preview. The old exact
   Notification ID must be not found.

Do not enable public send during canary validation.

## Public send

Public send remains disabled until the iOS release is live and the owner makes
a deliberate send decision. Preview first, verify factual copy and the rolling
seven-day gate, then enable the flag only for the controlled operation. Run
`send`, type the exact id, and watch aggregates. Disable public send again after
the operation. Stop on partial, blocked, failed, or any DLQ state.

## Cancel and provider-auth halt

For unsafe queued/sending work:

```bash
node scripts/send-ios-push.mjs cancel CAMPAIGN_ID
```

The route is idempotent. The consumer rechecks cancellation before page load
and before each send. Already accepted deliveries remain honest history.

Any APNs 403 blocks the campaign, preserves the unchanged page cursor, sends it
to DLQ, and stops new fan-out. Do not replay until the APNs credential problem
is repaired and a fresh canary proves it.

## DLQ repair and replay

1. Keep public send disabled.
2. Diagnose from aggregate status and Worker logs without exposing a token or
   cursor payload.
3. Repair the dependency or credential.
4. Prove a separate canary.
5. Replay the original id:

```bash
node scripts/send-ios-push.mjs replay CAMPAIGN_ID
```

Never create a replacement campaign to bypass cadence. Replay uses preserved
cursors and skips already terminal delivery rows.

Replay exactly once per blocked state, then poll aggregate status. A second
replay call after the preserved cursors were already drained (for example a
double-invocation after a partial replay) finds nothing to enqueue, flips the
campaign to `queued` with no in-flight queue message, and stalls silently —
confirmation review optional O-1. If aggregate status shows `queued` with no
progress after a replay, cancel the campaign and diagnose instead of replaying
again.

## APNs key rotation

1. Disable public send and cancel active work.
2. Create a new dedicated APNs key through Apple.
3. Replace `APNS_KEY_ID`, `APNS_TEAM_ID`, and `APNS_PRIVATE_KEY_P8` through
   interactive secret entry.
4. Deploy dark and prove a canary in each required environment.
5. Revoke the old key only after the new canary succeeds.

Suspected compromise skips normal overlap: disable sends, cancel work, revoke
the compromised key, replace it, then re-enter through dark deploy + canary.

## Encryption key rotation

Never overwrite V1 in place while V1 ciphertext remains. First ship code that
can decrypt the old version and encrypt with a new named version, migrate rows
in bounded verified batches, prove zero old-version rows, and only then remove
the old secret. A decrypt failure is NO-GO; do not register or send around it.

## Rollback

If migration or deploy fails, restore the previous Worker version. Keep
unregister available; do not delete D1/Queue data and do not roll back by
dropping tables. Leave registration/public flags false, inspect the exact
failure, and resume only after local tests and a dark deploy are green.

For a secret compromise, disable send first, cancel active campaigns, rotate or
revoke the affected credential, preserve D1 and DLQ evidence, and require a new
canary before replay.
