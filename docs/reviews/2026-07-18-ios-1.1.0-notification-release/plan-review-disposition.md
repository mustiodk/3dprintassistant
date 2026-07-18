# iOS 1.1.0 implementation plan — hostile review disposition

**Pre-review plan commit:** `1a0015f`

**State:** authenticated reviewer returned `GO-WITH-PATCHES`; all accepted
P1/P2 corrections are committed one finding per commit. First convergence
confirmed the original nine fixes and found one new P2, now patched; final
confirmation is pending. Implementation remains unauthorized.

## Attempts

1. `bridge --health` returned `ok` for Claude, Codex, git, and the common-parent
   cwd.
2. Canonical `bridge --mode claude-only` ran from the common parent for 432.0
   seconds and exited 0, but
   [`bridge-2026-07-18-170613-379500.md`](bridge-2026-07-18-170613-379500.md)
   contains an empty `## Claude (review)` section. It is transport evidence,
   not review evidence.
3. The direct read-only Claude fallback returned `Not logged in - Please run
   /login`. A second non-interactive probe returned the same result.
4. Owner-authorized browser OAuth and CAPTCHA completed successfully, but the
   locked macOS login keychain did not persist the fresh interactive credential.
   The canonical protected mode-600 headless OAuth environment was then
   verified with exact response `AUTH_OK` without printing its token.
5. Authenticated common-parent retry
   [`bridge-2026-07-18-215137-962163.md`](bridge-2026-07-18-215137-962163.md)
   exited 0 after 638.3 seconds with a non-empty Claude section and verdict
   `GO-WITH-PATCHES`: five P1, four P2, and four optional findings.
6. Convergence review
   [`bridge-2026-07-18-220943-262334.md`](bridge-2026-07-18-220943-262334.md)
   confirmed every original P1/P2 correction and both controller technical
   corrections, then found one new P2 in the formal coordinator interface.

## Required findings

| Finding | Severity | Decision | Status | Commit |
|---|---:|---|---|---|
| Vitest would collect existing `node:test` suites | P1-A | Accept | Patched with push-only include | `f6fa71b` |
| Rate-limit namespace described as an external resource | P1-B | Accept risk; correct premise | Patched with account-unique developer-owned id gate; no nonexistent create command | `331ef5d` |
| Notification-center delegate assignment absent | P1-C | Accept | Patched | `9667e2d` |
| Coordinator-to-router ownership unspecified | P1-D | Accept | Patched with observable composition/reaction path | `58614b8` |
| Notification cold-launch catalog preparation unspecified | P1-E | Accept | Patched with single-snapshot ordering | `f374906` |
| New route missing exhaustive destination arm | P2-A | Accept | Patched | `40ac085` |
| Delivery paging index columns unnamed | P2-B | Accept | Patched | `4a05a3e` |
| APNs JWT expiry test lacked injected clock | P2-C | Accept | Patched | `387e3a9` |
| Simulator cannot prove file protection | P2-D | Accept | Patched with physical-device gate | `481d527` |
| Pending-new-printer launch gate absent from formal interface | P2-E | Accept | Patched with launch gate and revision interfaces | `c6699f5` |

Cloudflare primary documentation defines `namespace_id` as a developer-chosen
positive-integer string unique within the account; the reviewer-proposed
`wrangler rate-limit create` resource flow does not exist. The plan preserves
`11001` and adds an account-wide collision check before deployment.

## Optional findings

| Finding | Decision | Status | Commit/evidence |
|---|---|---|---|
| Five retries means six total attempts | Accept | Set four retries = five total attempts | `faa6043` |
| APNs expiration upper bound not asserted | Accept | Added injected-clock upper-bound assertion | `c8232d1` |
| `.assetsignore` redundantly adds `scripts/**` | Reject as stale | Current plan list does not add either `scripts` entry | Plan Task 1 Step 3 |
| Fall back to `codex-only` after Claude timeout | Reject mode; accept resilience | Direct read-only Claude fallback preserves cross-model independence for a Codex controller | `389423b` |

## Stop rule

- Preserve the invalid empty Bridge artifact but derive no verdict from it.
- Rerun the authenticated hostile review against the patched plan.
- Do not implement, provision infrastructure, push iOS, or dispatch TestFlight
  until a non-empty final reviewer verdict has no unresolved P0/P1/P2 and the
  owner explicitly selects execution.
