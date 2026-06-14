# 2026-06-14 — Cowork (appdev): Printer-intake real backlog run + Anycubic Mega X ship

## Durable context

- **The real Discord backlog must be seeded MANUALLY.** The live tee only captures
  *new* `missingPrinter` feedback going forward; historical requests live in Discord
  `#web-app-feedback` and have to be `wrangler kv bulk put` into `PRINTER_INTAKE`. The
  Scout/Assistant pipeline can't fetch Discord itself.
- **File/image attachments do not reach this agent session.** The owner tried 5×
  (1 interrupted paste + 2 file attaches + 3 empty messages); nothing landed on disk,
  in app storage, or on the clipboard. Only a **plain-text paste** worked. Next time
  the owner says "attached", ask for text. (Memory: `feedback_attachments_dont_reach_session`.)
- **The two "agents" are different kinds of thing (owner asked).** The Scout is a
  deterministic Node *script* (`scripts/printer-intake-scout.js`) — it ran and produced
  the screening. The Printer Addition Assistant is an *in-session, owner-gated contract*
  the controller executes (research/draft/gate/ship), not a standalone bot — by design,
  because shipping needs judgment + owner approval. Sub-agents were used for spec research
  + adversarial review; the gated decisions stayed with the controller.
- **Mega X `max_acceleration=400` is manufacturer-sourced, NOT an app-cap.** From
  Anycubic's OFFICIAL firmware `DEFAULT_MAX_ACCELERATION {400,400,60,10000}` (X/Y=400) at
  `github.com/ANYCUBIC-3D/MEGA_X_V1.2.6` → `Configuration.h:517`, with the stock Marlin
  `{9000,9000}` deliberately commented out on `:516`. It's the lowest bedslinger accel in
  the catalog (next is 5000) because the Mega X is a slow 2020 Bowden Cartesian; the field
  is advisory-only (HIGH-012 warning copy), so a low value only makes advice more cautious.
- **Overlay collision rule (load-bearing, the 2026-06-14 bug):** `anycubic` is bundled in
  v1.0.4, so it must NOT be added to overlay `brands` (would collide → iOS runtime drops the
  WHOLE overlay). `mega_x` references the bundled anycubic brand; the ship validator resolves
  it via the baseline brand-union (≥ min_app_version). `voxelab` stays an overlay brand
  (not bundled). content_version `2026061402` (UTC 2026-06-14, seq 02 after `2026061401`).
- **iOS XCTest data-only waiver invoked** — full Xcode is unavailable on this Mac
  (`xcode-select` → CommandLineTools; no `/Applications/Xcode*.app`). Value-only add, no
  engine/Swift/schema/new-key change, byte-identical `diff -q`, web gates + overlay
  validator green, void conditions checked (bowden/bedslinger/none pre-exist; "Mega Series"
  is a free-string series_group) → waiver legitimate.

## What happened / Actions

- Cold-start (3dpa) → locked entry was real-backlog seeding. Live KV held only 2 stale
  rehearsal seeds; smoke-ran the Scout (Aries→duplicate now bundled, Photon→declined) to
  confirm the post-Aries-ship pipeline. Then blocked ~3h on the backlog data (attachments
  not arriving) until the owner pasted 16 entries as text.
- Seeded all 16 **verbatim** (no cleaning/screening per owner) via `kv bulk put` (tee
  payload shape, 90-day TTL); left the 2 rehearsal seeds untouched. Ran the Scout
  (watermark-respecting) → **3 needs-research / 1 duplicate / 5 declined-non-fdm / 7
  unactionable**.
- Cross-checked the 3 survivors vs the 70-printer catalog: **Mega X** = genuine novel FDM
  (the one real add); **X2D** = already-bundled Bambu Lab X2D ("Bmbulab" typo defeated
  brand-dedupe); **Sparkx i7 w/CFS** = already-bundled Creality i7 ("w/CFS" suffix defeated
  model-dedupe). Both false positives → no add.
- Mega X add via the protocol: sub-agent manufacturer research → drafted `printers.json`
  row + walkthrough combo 13 (on a feature branch under a commit-boundary hold) → all gates
  green → iOS byte-identical mirror (waiver) → overlay add (`2026061402`) → adversarial
  reviewer sub-agent **GO** (re-read firmware to confirm the 400 value) → visual picker
  proof (Anycubic → Mega Series → Mega X) → owner approved → **pushed to live + verified
  live** (`curl` → `2026061402 [aries,mega_x]`) → released hold.
- Captured the 2 Scout findings in ROADMAP (`115e628`).

## Files touched (Modified / Untracked)

Web (`3dprintassistant`):
- Modified: `data/printers.json`, `scripts/walkthrough-harness.js`,
  `catalog/ios-printer-overlay-v1.json`, `docs/planning/ROADMAP.md`.
- Untracked → committed: this session log, `docs/sessions/INDEX.md` entry,
  `docs/sessions/NEXT-SESSION.md` (regenerated).

iOS (`3dprintassistant-ios`):
- Modified: `3DPrintAssistant/Data/printers.json` (byte-identical mirror, local-only).

Throwaway (NOT committed, `/tmp`): seed builder, overlay builder, commit-message files.

## Commits

Web (`3dprintassistant`, pushed `8d9117d..115e628`):
- `ebff194` data: add Anycubic Mega X (Mega Series)
- `8ad4293` data: publish Anycubic Mega X iOS overlay (content_version=2026061402)
- `115e628` docs(roadmap): record real-backlog run + Mega X ship + 2 Scout follow-up findings
- (+ wrap commit: this log + INDEX + NEXT-SESSION)

iOS (`3dprintassistant-ios`, **local only — push gate**, 4 ahead of origin):
- `9ea28c3` data: sync printers.json — add Anycubic Mega X

## Open questions / Follow-up

- **[Scout finding 1 — dedupe robustness] (P2, ROADMAP, locked next entry)** — brand
  typos + model-variant suffixes defeat the Scout's dedupe → already-shipped printers
  surface as needs-research false positives. Fix: brand-alias/fuzzy map + suffix-stripping
  in `printer-intake-scout.js` + tests. Safety net (Assistant catalog cross-check) held.
- **[Scout finding 2 — general-feedback requests invisible] (P2, ROADMAP, locked next
  entry)** — requests filed via the general-feedback form never reach the Scout (tee only
  tees `missingPrinter`). Fix needs owner-pick: (a) form-UX nudge; (b) widen tee + heuristic.
- **md-hygiene (carried from 2026-06-14 overlay session, still unfixed):**
  `3dprintassistant/CLAUDE.md:63` + `docs/3dpa-context.md` say "Cloudflare Pages"; it's
  actually Workers + Assets. Owner-decision doc fix; not auto-edited.
- **Lesson/finding sweep:** lesson-spotter compact → 1 candidate accepted (attachments
  don't reach the session → memory). No K1 (reviewer agreed/GO), no K4 (no tool overruled
  the controller). The 2 Scout findings are product/process (ROADMAP), not cross-AI
  methodology K-findings. Calibration row appended.
- **verify-before-mutate summary (Trigger A):** `0 flags (0 resolved, 0 ignored), 0
  destructive-core, 8 unclassified, 5 generated-write` — no evidence-gap flags this session;
  the 5 generated-writes were /tmp builder + commit-message files (correctly demoted).
- **MCP:** none in scope (pipeline used wrangler CLI + curl + the local preview server).

## Next session

**Locked entry = the two Scout findings** (ROADMAP Active Work Queue). Start with finding 1
(dedupe robustness — clear fix, schedule it) and get the owner's pick on finding 2 (a vs b)
before building. Mega X is shipped + live; the real-backlog run is closed.
