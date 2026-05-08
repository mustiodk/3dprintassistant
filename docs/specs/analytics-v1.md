# Analytics v1 — first-party usage events

**Status:** v1.0.3 candidate.
**Owner:** 3D Print Assistant web + iOS.
**Backend:** Cloudflare Worker `/api/analytics` → Workers Analytics Engine dataset `3dpa_usage_v1`.

## Purpose

Analytics v1 answers product-usage questions without creating a user-tracking system:

- Which surface is used: web or iOS?
- Which printer brands and models are selected most?
- Which material / nozzle / environment / support / color combinations are common?
- Do people open feedback?

The event stream is deliberately aggregate-only. It does not include user IDs, session IDs, device IDs, IP addresses, emails, free text, or generated slicer output.

## Event Contract

All events use this envelope:

```json
{
  "event": "profile_generated",
  "properties": {
    "platform": "ios",
    "channel": "appstore",
    "appVersion": "1.0.3",
    "locale": "en_DK"
  }
}
```

Only the three events below are accepted.

### `app_opened`

Sent once per page load on web and once per app process on iOS.

Allowed properties:

| Key | Example | Notes |
|---|---|---|
| `platform` | `web`, `ios` | Required by clients. |
| `channel` | `production`, `preview`, `local`, `debug`, `appstore`, `sandbox_or_testflight` | Coarse release channel, not a user identifier. |
| `appVersion` | `1.0.3` | Marketing version. |
| `buildNumber` | `202605081930` | iOS only. |
| `locale` | `en_DK` | Device/browser locale. |

### `profile_generated`

Sent when a valid output profile is rendered. Re-render duplicates are deduplicated in-memory per browser/app process so UI lifecycle churn does not inflate counts. There is no cross-session identifier.

Allowed properties:

| Key | Example | Notes |
|---|---|---|
| `platform` | `web`, `ios` | |
| `channel` | `production`, `preview`, `local`, `debug`, `appstore`, `sandbox_or_testflight` | |
| `appVersion` | `1.0.3` | |
| `buildNumber` | `202605081930` | iOS only. |
| `locale` | `en_DK` | |
| `printerBrand` | `bambu_lab` | Printer manufacturer id. |
| `printerModel` | `x1c` | Printer id, not a custom name. |
| `printerSeries` | `CoreXY` | Coarse series/group label when available. |
| `material` | `petg_basic` | Material id. |
| `materialGroup` | `PETG` | Data-file group. |
| `nozzle` | `std_0.4` | Nozzle id. |
| `environment` | `normal` | Environment id. |
| `support` | `none` | Support preset id. |
| `colors` | `single` | Color/multimaterial preset id. |
| `profileMode` | `safe` | `safe` or `tuned`. |
| `slicer` | `bambu_studio` | Engine-resolved slicer id. |

### `feedback_opened`

Sent when the in-app/web feedback surface opens.

Allowed properties:

| Key | Example | Notes |
|---|---|---|
| `platform` | `web`, `ios` | |
| `channel` | `production`, `preview`, `local`, `debug`, `appstore`, `sandbox_or_testflight` | |
| `appVersion` | `1.0.3` | |
| `buildNumber` | `202605081930` | iOS only. |
| `locale` | `en_DK` | |
| `feedbackCategory` | `missingPrinter` | Category selected at open time when known. |

## Worker Storage Mapping

Workers Analytics Engine stores ordered arrays, so the field order is fixed:

| Blob | Meaning |
|---|---|
| `blob1` | schema version (`analytics_v1`) |
| `blob2` | event |
| `blob3` | platform |
| `blob4` | channel |
| `blob5` | app version |
| `blob6` | build number |
| `blob7` | locale |
| `blob8` | printer brand |
| `blob9` | printer model |
| `blob10` | printer series |
| `blob11` | material |
| `blob12` | material group |
| `blob13` | nozzle |
| `blob14` | environment |
| `blob15` | support |
| `blob16` | colors |
| `blob17` | profile mode |
| `blob18` | slicer |
| `blob19` | feedback category |
| `blob20` | reserved |
| `double1` | count (`1`) |
| `index1` | coarse sampling key (`event:platform`) |

Queries must use `_sample_interval` when summing counts.

## Privacy Boundary

Do collect:

- Product interaction events listed above.
- Coarse platform/channel/version/locale.
- Selection ids from the existing app state.

Do not collect:

- User ID, session ID, IDFA, IDFV, or device identifier.
- IP address or user-agent in the analytics payload.
- Email or feedback free text.
- Generated profile output / slicer values.
- Custom names or uploaded content.
- Cross-session profile history for a single person.

## Operational Notes

- Web requests are authenticated by origin allowlist.
- iOS requests are HMAC signed with the existing app-to-worker HMAC secret.
- If the Analytics Engine binding is missing, the endpoint returns `{ ok: true, stored: false }` so analytics cannot break the product.
- Web users can opt out locally with `localStorage.setItem('3dpa_notrack', '1')`.
