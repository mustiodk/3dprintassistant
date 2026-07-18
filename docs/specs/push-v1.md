# iOS Push Provider Contract v1

Status: local implementation contract for the owner-gated iOS 1.1.0 train. It
does not assert that Apple or Cloudflare resources exist or that a push has
been sent.

## Privacy and trust boundaries

Push is optional and accountless. Registration accepts only the APNs token,
APNs environment, selected topic mask, app version, and build number. The
Worker does not persist an IP address, user agent, locale, account identifier,
open receipt, or notification payload identifier on a device row.

The raw APNs token is SHA-256 hashed for lookup and AES-256-GCM encrypted at
rest. The first 16 lowercase hex characters of the hash form the support-only
Notification ID. It is not an account or analytics identifier. Ambiguous
prefixes fail closed.

All push responses use `Cache-Control: no-store`. Source code, migrations,
configuration, docs, and scripts are excluded from static assets and denied by
the Worker before asset lookup. Tokens, ciphertext, HMAC values, bearer tokens,
APNs keys, and full Notification IDs must never be logged.

## Registration API

Routes:

- `POST /api/push/register`
- `POST /api/push/unregister`

Both use the dedicated iOS registration secret, never the admin token or an
existing feedback secret. The client sends:

- `X-3DPA-Timestamp`: integer Unix seconds, accepted within five minutes;
- `X-3DPA-Signature`: base64 HMAC-SHA256 over
  `timestamp + "\n" + exactRawBody`.

The raw body is limited to 4096 bytes before JSON parsing. Register is also
rate-limited by `CF-Connecting-IP`; that value is not stored. Missing rate-limit
configuration fails register closed. `PUSH_REGISTRATION_ENABLED=false` fails
register closed but never disables unregister.

Register body:

```json
{
  "schema_version": 1,
  "token": "lowercase-even-hex",
  "previous_token": "optional-lowercase-even-hex",
  "environment": "development",
  "topics": ["new_printers"],
  "app_version": "1.1.0",
  "build_number": "202607181200"
}
```

The only topics are `new_printers` and `app_updates`. At least one is required.
Token length is not fixed. Rotation upserts the new encrypted route, changes
the old route's pending/retryable deliveries to `token_rotated`, and deletes
the old device row in one D1 batch.

Unregister body:

```json
{"schema_version":1,"token":"lowercase-even-hex","environment":"production"}
```

Unregister deletes the device row and its device-specific delivery rows. It is
idempotent and returns `{"removed":true|false}`.

## Campaign API

All admin routes require `Authorization: Bearer <PUSH_ADMIN_TOKEN>` with a
constant-time comparison. The token exists only as a Worker secret and in the
owner's mode-0600 `.push-admin.env` or macOS Keychain.

- `POST /api/push/admin/campaigns`: preview or confirm/create;
- `GET /api/push/admin/campaigns/:id`: aggregate status only;
- `POST /api/push/admin/campaigns/:id/cancel`: idempotent emergency stop;
- `POST /api/push/admin/campaigns/:id/replay`: replay preserved cursors for the
  same campaign id.

Campaigns are either:

- `topic=new_printers`, `kind=new_printer`, with `brand_id` + `printer_id`; or
- `topic=app_updates`, `kind=app_update`, with `release_version`.

Title is 1–60 characters and body is 1–180 characters. The complete APNs JSON
must be below 4096 bytes. Canary campaigns require one exact, unique,
topic-consented 16-hex Notification ID. Public campaigns forbid it.

The first request is always a dry-run preview unless both
`confirm_campaign_id` and `confirm_preview_digest` are present and match the
same draft. Duplicate ids fail. `PUSH_PUBLIC_SEND_ENABLED=false` blocks public
creation but not previews, canaries, status, cancel, replay, or unregister. A
non-cancelled public campaign blocks another public campaign for rolling seven
days. Canary sends do not consume that cadence.

Status returns campaign metadata and these aggregates only:

- `accepted_count` — APNs accepted the request; this is not device receipt;
- `consent_removed_count`;
- `token_rotated_count`;
- `invalid_count`;
- `failed_count`.

It never returns hashes, tokens, ciphertext, or per-device rows.

## Payload and APNs contract

Payload schema v1 supports only `new_printer` and `app_update`. It contains
public product routing fields and no arbitrary URL. APNs requests pin:

- `apns-topic=dk.mragile.3DPrintAssistant`;
- `apns-push-type=alert`;
- `apns-priority=10`;
- integer expiration no later than one hour;
- `apns-collapse-id=<announcement_id>`.

ES256 provider JWTs are reused for less than 50 minutes. APNs 2xx is
`apns_accepted`; 410, `BadDeviceToken`, and `DeviceTokenNotForTopic` invalidate
the token; 429, 5xx, and transport failures retry; every 403 blocks the whole
campaign and preserves the unchanged cursor before explicit DLQ send.

## Queue and storage contract

Queue bodies contain only:

```json
{
  "schema_version": 1,
  "campaign_id": "campaign-id",
  "environment": "production",
  "after_token_hash": null
}
```

No raw token crosses Queue or DLQ. Fan-out pages 100 stable hashes, decrypts
only the current page, uses at most ten send workers, and rechecks cancellation
before each APNs call. Terminal ledger rows are skipped during replay. A
missing device becomes `consent_removed`; a rotation compare-and-set remains
`token_rotated`. A replay cursor is persisted before provider-auth or exhausted
retry work is sent to DLQ.

Daily retention deletes delivery rows older than 30 days and device rows whose
registration refresh and last APNs success are both older than 180 days.
Aggregate campaign rows remain without a device identifier.
