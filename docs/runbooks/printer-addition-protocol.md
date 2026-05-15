# Printer Addition Protocol

Use whenever adding, republishing, or deprecating a printer in 3dpa.

**Background.** Authored after the post-mortem of the X2D / H2D Pro overlay-only
mishap (2026-05-10) and the SPARKX i7 → Creality i7 taxonomy fix (2026-05-12). v2
(2026-05-15) trimmed per Codex review: replaced paste-bash with a checked-in
picker dry-run script, merged the verification phases, made reviewer dispatch
risk-triggered instead of mandatory. See
[`codex/printer-addition-protocol-review/codex-2026-05-15-printer-addition-protocol-packet.md`](../../codex/printer-addition-protocol-review/codex-2026-05-15-printer-addition-protocol-packet.md)
for the full simplification trail.

## Mental model (read first — load-bearing)

- **Source of truth = bundled data.** Web reads `data/printers.json`. iOS reads
  its own copy at `3DPrintAssistant/Data/printers.json` (byte-identical mirror)
  plus the overlay merged on top.
- **Overlay = additive same-day patch**, not an alternative path. Current iOS
  binary users see overlay entries until the next binary subsumes them.
- **Done = all three surfaces agree** on id, manufacturer, series_group, every spec field.
- **Overlay cannot retract a bundled entry from a shipped iOS binary.**
  Deprecation is asymmetric (see Phase 4).

## Phase 1 — Taxonomy decision (before editing any file)

1. **Record sources.** Vault clipping paths or manufacturer URL. Paths go in the
   commit body. No second-hand recollection.
2. **Decide four fields:**
   - `manufacturer` — must match an existing brand id unless owner has explicitly
     approved a new `brands[]` row. Last legitimate new brand was years ago; new
     brands are rare.
   - `series_group` — the picker sub-header label under the brand. Reuse a
     sibling's label; do not invent.
   - `id` — stable internal id, `snake_case`. Once published in an overlay, it
     cannot change.
   - `name` — picker row label.
3. **Sanity question.** Where does the manufacturer themselves put this on their
   site/store? If your decision disagrees with that, stop and re-check.

## Phase 2 — Picker dry-run (pre-commit gate)

After editing `data/printers.json`, before committing, run:

```bash
node scripts/picker-dry-run.js <brand_id> <series_group> <printer_id> [wrong_brand_id]
```

Example: `node scripts/picker-dry-run.js creality "i Series" sparkx_i7 sparkx`

GREEN = proceed to Phase 3. RED = taxonomy is wrong, return to Phase 1. The
optional `wrong_brand_id` arg asserts that a specific brand id does **not**
exist — use it whenever sources contain a misleading brand cue (the SPARKX/i7
class of bug).

The script is tested by `scripts/picker-dry-run.test.js`; run
`node scripts/picker-dry-run.test.js` if you touch the script itself.

## Phase 3 — Implementation + verification

**Commits.** One printer = one focused commit per repo:

1. **Web commit** — `data/printers.json` + `scripts/walkthrough-harness.js`
   combo for the new printer. Subject: `data: add <brand> <model> (<series_group>)`.
2. **iOS mirror commit** — byte-identical `cp` of `data/printers.json` to the
   iOS bundled copy. Subject: `data: sync printers.json — add <brand> <model>`.
3. **Overlay commit (only if shipping to current iOS users)** — edit
   `catalog/ios-printer-overlay-v1.json` payload, bump `content_version`,
   recompute `payload_sha256` per
   [`docs/specs/ios-remote-printer-catalog.md`](../specs/ios-remote-printer-catalog.md),
   run `node scripts/validate-ios-printer-overlay.js`. Subject:
   `data: publish <brand> <model> iOS overlay (content_version=YYYYMMDDNN)`.

**Forbidden in any of these commits:** `engine.js` touches, marketing copy
edits, correction sweeps across other printers, validator code changes.
Those land in their own arc.

**Verification — all green before Phase 7:**

```bash
node scripts/validate-data.js
node scripts/picker-dry-run.js <brand_id> <series_group> <printer_id> [wrong_brand_id]
node scripts/walkthrough-harness.js
node scripts/profile-matrix-audit.js
node scripts/validate-ios-printer-overlay.js   # only if overlay touched
xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=<available>' \
  -only-testing:3DPrintAssistantTests CODE_SIGNING_ALLOWED=NO
```

**Owner visual picker check** — required if (a) the overlay was published OR
(b) a new brand row was added OR (c) a new `series_group` was introduced. Open
the running web app and confirm the printer appears under the expected
brand → series_group. If wrong: STOP, fix taxonomy, replay Phase 3.

**Live overlay confirmation** — only if Phase 3 step 3 ran. After web push +
Cloudflare deploy:

```bash
curl -s https://3dprintassistant.com/catalog/ios-printer-overlay-v1.json \
  | jq '{content_version, printers: .payload.printers|map(.id)}'
```

Confirm `content_version` matches what you published.

## Phase 4 — Deprecation / removal (asymmetric)

The overlay cannot retract what is already bundled in shipped iOS binaries.
Removing a printer is rare and requires care. **Before any deprecation work,
read the overlay spec at
[`docs/specs/ios-remote-printer-catalog.md`](../specs/ios-remote-printer-catalog.md)
and decide deprecate (keep id, hide from picker, preserve stored profiles) vs
remove (mistake / never-public only).** When the first real deprecation
happens, capture the executed procedure here as Phase 4a.

## Phase 5 — Self-check (10-bullet checklist; gates Trigger A wrap-up)

Run through this list before declaring the session complete. Every line must
be `[x]` or have an explicit reason it does not apply. If any line is `[ ]`,
the wrap-up is blocked.

- [ ] Sources cited in plan or commit body (path or URL).
- [ ] Taxonomy matches existing brand picker; new `brands[]` row, if any, has
      explicit owner sign-off.
- [ ] Phase 2 picker dry-run output captured in commit body or session log.
- [ ] Web commit is one printer; no `engine.js`, marketing, or correction-sweep
      mixing.
- [ ] iOS mirror commit byte-identical (`diff -q web iOS` exit 0).
- [ ] Overlay commit (if any): `content_version` bumped, `payload_sha256`
      recomputed, validator green.
- [ ] `validate-data` + `walkthrough-harness` + `profile-matrix-audit` + iOS
      XCTest all green at HEAD.
- [ ] No `engine.js`, `app.js`, validator, or spec file edited in printer
      commits.
- [ ] Owner visual picker check OK (only if overlay touched, new brand, or new
      series_group).
- [ ] Live overlay URL confirms published `content_version` (only if overlay
      was deployed).

### Risk-triggered reviewer dispatch

Escalate to `superpowers:requesting-code-review` against the printer-add diff
when **any** of these fire:

- New `brands[]` row added.
- New `series_group` introduced under an existing brand.
- Overlay publish to current iOS users (not bundled-only).
- `engine.js`, `app.js`, validator, or overlay spec touched anywhere in the
  diff.
- Sources conflicted on a key spec field.
- Deprecation or removal (Phase 4).
- More than one printer added in the same session.

If none of those fire, the self-check above is sufficient. This aligns with
the `ai-collab.md` risk-based second-model rule.

## What this protocol forbids

- Editing the overlay without editing bundled `data/printers.json`.
- Mixing a printer add with engine, marketing, correction-sweep, or validator
  work.
- Adding a new `brands[]` row without owner sign-off.
- Trusting a single source for taxonomy.
- Running Trigger A wrap-up before Phase 5 self-check is fully `[x]` (and
  reviewer dispatch returned GO, if triggered).

## Cross-references

- Overlay system spec: [`../specs/ios-remote-printer-catalog.md`](../specs/ios-remote-printer-catalog.md)
- Standard data-change gate: [`./profile-data-change-test-protocol.md`](./profile-data-change-test-protocol.md)
- Standing rules: [`../3dpa-context.md`](../3dpa-context.md) (rule 10)
- Vault trigger: `Obsidian Vault/20-Areas/Development/ai-collaboration/trigger-cheatsheet.md` → "Printer Addition Gate"
- v1 → v2 simplification trail: [`../../codex/printer-addition-protocol-review/codex-2026-05-15-printer-addition-protocol-packet.md`](../../codex/printer-addition-protocol-review/codex-2026-05-15-printer-addition-protocol-packet.md)
