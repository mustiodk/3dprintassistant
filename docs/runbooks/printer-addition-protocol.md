# Printer Addition Protocol

Use whenever adding, republishing, or deprecating a printer in 3dpa. Applies to both
overlay-only shipments (current iOS users between binaries) and bundled-only adds
(printers that ride the next binary).

## Background — why this exists

Authored after the post-mortem of the first two post-overlay-system printer additions
(2026-05-10 X2D / H2D Pro, 2026-05-12 SPARKX i7 → Creality i7). Both went sideways:
overlay was treated as an alternative to bundled data, taxonomy was wrong for the i7
("SPARKX" brand instead of Creality → i Series), validator was structurally unable to
allow same-day adds until mid-flight rework. Owner caught the i7 placement after it
shipped. This protocol closes those gaps.

## Mental model (read first)

- **Source of truth = bundled data.** Web reads `data/printers.json`. iOS reads its
  own copy at `3DPrintAssistant/Data/printers.json` (byte-identical mirror) plus the
  overlay merged on top.
- **Overlay is an additive same-day patch**, not an alternative path. Current iOS
  binary users see overlay entries until the next binary subsumes them into bundled.
- **A printer addition is "done" only when all three surfaces agree.** Web bundled,
  iOS bundled, and (if shipping overlay-only) the live overlay must agree on id,
  manufacturer, series_group, and every spec field.
- **An overlay cannot delete a bundled printer in already-shipped iOS.** Deprecation
  removes from bundled going forward; for shipped binaries the printer remains until
  users update.

---

## Phase 1 — Taxonomy decision (before editing any file)

1. **Record sources.** Vault clipping paths, manufacturer URL, FAQ, store listing.
   No second-hand recollection. Source paths go in the commit body and the session
   plan.
2. **Decide four fields:**
   - **`manufacturer`** — must match an existing brand id unless this is genuinely a
     new manufacturer. Check existing brands:
     ```bash
     node -e "(async()=>{const e=require('./engine.js');await e.init();console.log(e.getBrands().map(b=>b.id));})()"
     ```
   - **`series_group`** — the picker sub-header label under the brand. Look at
     siblings in `data/printers.json` for the same manufacturer; do not invent.
   - **`id`** — internal stable id, `snake_case`. Once published in an overlay it
     CANNOT change.
   - **`name`** — picker row label.
3. **Sanity question.** *Where does the manufacturer themselves put this product on
   their site/store?* If your decision disagrees, stop and re-check before coding.
4. **New-brand rule.** Adding a new `brands[]` row is a discrete owner-gated event
   (last real one was years ago). When in doubt, find the existing brand and use
   `series_group` for sub-categorization.

---

## Phase 2 — Picker dry-run (before any commit)

Build a tiny Node script that loads the engine *after* your bundled edit and asserts
the picker shape. This catches taxonomy errors that the data validator cannot see:

```bash
node -e "(async()=>{
  const e=require('./engine.js');
  await e.init();
  const brand=e.getPrintersByBrand('<expected_brand_id>');
  const group=(brand.groups||[]).find(g=>g.label==='<expected_series_group>');
  console.assert(group,'series_group missing');
  console.assert(group.printers.some(p=>p.id==='<new_id>'),'printer missing in group');
  console.assert(!e.getBrands().some(b=>b.id==='<wrong_brand_id>'),'spurious brand');
  console.log('picker dry-run GREEN');
})()"
```

If it red-lines, your taxonomy is wrong — not your code. Return to Phase 1.

---

## Phase 3 — Edit surfaces in order (additions)

Each step is its own commit. No bundling with unrelated work (correction sweeps,
marketing copy, validator tweaks, engine.js touches).

1. **Web bundled.** Add the printer entry to `data/printers.json`. Run the Phase 2
   dry-run. Run the Standard Gate from `./profile-data-change-test-protocol.md`.
   Commit: `data: add <brand> <model> (<series_group>)`.
2. **Walkthrough coverage.** Add at least one combo to
   `scripts/walkthrough-harness.js` covering the new printer with a representative
   material + nozzle. Same commit as step 1 — never separated by more than one commit.
3. **iOS bundled mirror.**
   ```bash
   cp data/printers.json ../3dprintassistant-ios/3DPrintAssistant/Data/printers.json
   ```
   Run iOS XCTest. Commit in the iOS repo:
   `data: sync printers.json — add <brand> <model>`.
4. **Overlay publish (only if shipping to current iOS users):**
   - Edit `catalog/ios-printer-overlay-v1.json`: add the printer entry to
     `payload.printers`. Leave `payload.brands` empty unless the brand is also new
     (owner-gated; see Phase 1 step 4).
   - Bump `content_version` to today's `YYYYMMDDNN` (NN = sequence).
   - Refresh `generated_at`.
   - Recompute `payload_sha256` per the overlay spec
     (`../specs/ios-remote-printer-catalog.md`).
   - Run `node scripts/validate-ios-printer-overlay.js`.
   - Commit: `data: publish <brand> <model> iOS overlay (content_version=YYYYMMDDNN)`.

---

## Phase 4 — Verification gates

All of these must be green before Phase 7:

- `node scripts/validate-data.js` — green.
- `node scripts/validate-ios-printer-overlay.js` — green (only if overlay touched).
- `node scripts/walkthrough-harness.js` — green; new combo passes.
- `node scripts/profile-matrix-audit.js` — green; 0 broad failures.
- iOS XCTest — green.
- Phase 2 picker dry-run — green.
- **Owner visual check** — open the web app and confirm the picker shows the printer
  under the expected brand → series_group. If wrong: STOP, fix taxonomy, replay Phase 3.

## Phase 5 — Live overlay confirmation (only if Phase 3 step 4 ran)

After web push + Cloudflare deploy:

```bash
curl -s https://3dprintassistant.com/catalog/ios-printer-overlay-v1.json | jq '{content_version, hash_ok: true, printers: .payload.printers|map(.id)}'
```

Confirm `content_version` matches what you just published. Spot-check on a current
iOS 1.0.3 device or simulator: relaunch, verify the printer appears in the picker.

---

## Phase 6 — Deprecation / removal

Removing a printer is rarer than adding one. The overlay cannot retract what is
already bundled in shipped iOS binaries, so removal is asymmetric.

### Decide first: deprecate vs remove

- **Deprecate** — keep the id, hide from picker, document EOL. Use when the printer
  was ever publicly available; preserves stored profiles and shareable URLs.
- **Remove** — delete from bundled going forward. Only use when the printer entry
  was a mistake or never publicly used.

### Deprecation procedure

1. **Web bundled.** Add `"deprecated": true` + `"deprecation_note": "<reason>"` to
   the printer entry. Engine (`engine.js`) and `app.js` filter out deprecated entries
   from `getBrands()` / `getPrintersByBrand()` for new-state picker rendering but
   keep them resolvable for stored state (so an old saved profile still resolves).
   - If engine support for the `deprecated` flag does not yet exist, add it in a
     separate prior commit (`feat: filter deprecated printers from picker`).
2. **Walkthrough.** Move the printer's combo to a `deprecated_combos[]` section or
   delete it; do not let a deprecated printer block the matrix.
3. **iOS bundled mirror.** `cp` as in Phase 3 step 3. iOS XCTest green.
4. **Overlay.** Generally no overlay action — current iOS users continue to see the
   bundled entry until the next binary. If absolutely needed, an overlay entry can
   carry the same `deprecated: true` flag to push the EOL state to current iOS users
   ahead of the next binary; this requires overlay-spec support and is a deliberate
   choice.
5. **Phase 4 verification gates** apply unchanged.

### Removal procedure (mistake / never-public only)

1. Confirm with owner that no shipped iOS binary has carried this id publicly.
   If it has, the removal becomes a deprecation per above.
2. Delete the entry from `data/printers.json`, walkthrough combo if any, and iOS
   bundled mirror. Each repo gets its own commit.
3. Overlay: if the id was ever published in an overlay, ship one final overlay with
   the entry removed (NOT a deprecation flag — actual removal). Bump
   `content_version`. Validator's bundled-baseline file is also updated to reflect
   the removal once iOS ships a binary without it.

---

## Phase 7 — Self-check via 3rd-party reviewer (gates Trigger A wrap-up)

**Do not start Trigger A until Phase 7 returns GO.**

Use the `superpowers:requesting-code-review` skill to dispatch an independent reviewer
subagent against the diff. This is the same 7-for-7 pattern from the v1.0.4 arc.

### Reviewer scope

Diff range = the printer-addition commits across both repos since the last clean
HEAD. Include:

- Web: `data/printers.json`, `catalog/ios-printer-overlay-v1.json`,
  `scripts/walkthrough-harness.js`, any `app.js` / `engine.js` touch.
- iOS: `3DPrintAssistant/Data/printers.json`, any test changes.

### Reviewer checklist (paste into the dispatch prompt)

1. **Taxonomy.** Manufacturer + series_group present and consistent across web
   bundled, iOS bundled, overlay (if touched), walkthrough, and any UI copy. No
   accidental new brand.
2. **Source attribution.** Commit bodies cite at least one source path/URL per
   non-trivial spec field. No "I remember reading."
3. **Surface lockstep.** Web bundled, iOS bundled, and overlay (if touched) carry
   identical specs for the new printer. Hash recomputed if overlay edited.
4. **Commit shape.** One printer = one commit per surface. No bundled correction
   sweeps, marketing copy edits, validator changes, or engine touches mixed in.
5. **Picker dry-run.** Evidence of Phase 2 script run captured in the session plan
   or commit body.
6. **Verification gates.** Phase 4 evidence captured: validate-data, overlay
   validator, walkthrough, matrix-audit, iOS XCTest, owner visual check.
7. **Deprecation (only if Phase 6 ran).** Engine-side filtering coherent; old saved
   state still resolves; no broken walkthrough.
8. **No spurious damage.** Diff does not silently rename ids, alter unrelated
   printer fields, or change engine behavior.

### Outcomes

- **GO (0 Critical / 0 Important)** → proceed to Trigger A wrap-up.
- **Important+** → tighten in a follow-up commit, re-run Phase 4, re-dispatch
  reviewer. Wrap-up stays gated.
- **Medium / Minor** → owner decision: ship now and carry to next release, or
  tighten before wrap-up.

The session is not "complete" until the reviewer returns GO.

---

## What this protocol forbids

- Editing the overlay without editing bundled.
- Adding a printer in the same commit as engine / data correction / marketing edits.
- Adding a new `brands[]` row without explicit owner sign-off.
- Trusting a single source for taxonomy.
- Treating "validator passes" as taxonomy verification — the validator does not
  know about brand pickers.
- Running Trigger A before Phase 7 reviewer returns GO.

---

## Cross-references

- Overlay system spec: `../specs/ios-remote-printer-catalog.md`
- Validator: `../../scripts/validate-ios-printer-overlay.js`
- Shipped iOS catalog baseline (validator input):
  `../../catalog/ios-bundled-catalog-baselines.json`
- Standard data-change gate: `./profile-data-change-test-protocol.md`
- Standing rules: `../3dpa-context.md`
- Trigger A close protocol: `/Users/mragile.io/Documents/Claude/Projects/CLAUDE.md`
- Vault trigger entry: `Obsidian Vault/20-Areas/Development/ai-collaboration/trigger-cheatsheet.md` →
  "Printer Addition Gate" under "3dpa Work Gates".
