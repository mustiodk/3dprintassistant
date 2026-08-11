# Elegoo Primary Brand — Implementation Plan

**Goal:** Show Elegoo in the primary brand row (top 6) on web and iOS, without
expanding "show more".

**Design:** [`../specs/2026-08-11-elegoo-primary-brand-design.md`](../specs/2026-08-11-elegoo-primary-brand-design.md) ·
**Issue:** [#31](https://github.com/mustiodk/3dprintassistant/issues/31)

**Architecture:** A single data-field change consumed by existing presentation
code on both surfaces. No `engine.js`, no UI code, no CSS, no locales, no Worker.
Phase 3 adds a missing mode to `republish-overlay.js` and is only executed if the
owner takes route R3.

**Tech stack:** JSON data, existing Node validators and walkthrough harness,
iOS bundled catalog, `republish-overlay.js` + `validate-ios-printer-overlay.js`.

## Global constraints

- The only data edit is `brands[].primary` for `elegoo`, `false → true`. **No
  `sort_order` change, no other brand touched.**
- **Never `cp data/printers.json` to iOS.** Web is 81 printer rows, iOS bundled
  is 78 by overlay design. Edit the one `brands[]` field in place.
- One finding = one commit per platform.
- Golden snapshot must report **NO DRIFT**. Drift is a stop-and-investigate
  signal, never a re-baseline.
- iOS `main` stays push-gated. Web pushes freely.
- Phase 3 does not begin without an explicit owner decision on R3 (design §8.2).

---

## Phase 1 — Web (route R1)

### Task 1: Flip the flag and verify the picker

**Files:** Modify `data/printers.json`

- [ ] **Step 1: Establish the pre-change baseline**

Record the current primary set so the diff is provable, not assumed:

```bash
node -e "
const b=require('./data/printers.json').brands;
console.log('primary:', b.filter(x=>x.primary).map(x=>x.id).join(', '));
"
```

Expect exactly: `bambu_lab, creality, prusa, anycubic, qidi`.

- [ ] **Step 2: Make the edit**

In `data/printers.json`, the `elegoo` row in `brands[]`: `"primary": false` →
`"primary": true`. Change nothing else on the row.

- [ ] **Step 3: Confirm the resulting set is the top 6 by sort_order**

```bash
node -e "
const b=require('./data/printers.json').brands;
const p=b.filter(x=>x.primary).sort((a,c)=>a.sort_order-c.sort_order);
console.log(p.map(x=>x.sort_order+':'+x.id).join(', '));
console.log('count:', p.length, '| contiguous 1-6:', p.every((x,i)=>x.sort_order===i+1));
"
```

Expect 6, contiguous `1..6`, ending in `6:elegoo`. Contiguity is the real
assertion — it proves the primary set is still "the top N by sort order" and not
an arbitrary subset.

- [ ] **Step 4: Run the data + engine gates**

```bash
node scripts/validate-data.js
node scripts/walkthrough-harness.js
node scripts/engine-golden-snapshot.js --check
```

All must pass, and the golden check must print `NO DRIFT`. If it drifts, stop —
something consumes `primary` that should not.

- [ ] **Step 5: Browser check, including the narrow viewport**

Serve locally (`npx serve -l 4200 .`) and confirm in the printer picker:

1. Six brand chips visible without pressing "show more", ending in Elegoo.
2. Selecting Elegoo still lists its printers and the picker behaves normally.
3. **At 320px width** (iPhone SE), all six chips are fully visible and none is
   clipped. `.printer-brands` is `max-height: 200px; overflow: hidden` and
   `.chips` wraps, so this is where headroom is thinnest — this step is the
   actual layout gate, not an optional polish pass.

- [ ] **Step 6: Commit**

```
feat(data): show Elegoo in the primary brand row

Requested by a user alongside a positive App Store review. Elegoo was
already sort_order 6 but not primary, so it sat behind "show more".
Flipping the flag makes the default row exactly the top 6 by sort order
with no reordering.

Editorial by design — see docs/superpowers/specs/2026-08-11-elegoo-primary-brand-design.md §1.
```

### Task 2: Guard the primary set (optional, recommended)

**Files:** Modify a web test suite (suggest `scripts/validate-data.js` or a
focused suite)

**Rationale:** design §7 — nothing currently pins the live primary set, so an
accidental future flip would ship silently.

- [ ] **Step 1: RED first.** Add an assertion that the primary set is exactly
  the contiguous top 6 by `sort_order`. Run it against a deliberately wrong
  expected list, observe the failure, then correct it. Leave the
  `// RED demo verified 2026-08-11: <explanation>` breadcrumb per `CLAUDE.md`.

- [ ] **Step 2: Commit separately** from Task 1 (one finding = one commit).

---

## Phase 2 — iOS bundled (route R2)

### Task 3: Mirror the one field

**Files:** Modify `3DPrintAssistant/Data/printers.json` (iOS repo)

- [ ] **Step 1: Prove the current delta before editing**

```bash
node -e "
const fs=require('fs');
const w=JSON.parse(fs.readFileSync('data/printers.json','utf8'));
const i=JSON.parse(fs.readFileSync('../3dprintassistant-ios/3DPrintAssistant/Data/printers.json','utf8'));
console.log('web printers', w.printers.length, '| ios printers', i.printers.length);
console.log('web-only:', w.printers.map(p=>p.id).filter(x=>!i.printers.some(p=>p.id===x)));
"
```

Expect `81 / 78` and `['ender_3_s1','kobra_2_neo','adventurer_3']`. **If this
prints anything else, stop** — the mirror assumption has changed and the
plan needs revisiting.

- [ ] **Step 2: Edit the single `brands[]` field** in the iOS bundled file.
  Do not copy the web file.

- [ ] **Step 3: Verify only that field moved**

```bash
git -C ../3dprintassistant-ios diff --stat
git -C ../3dprintassistant-ios diff -- 3DPrintAssistant/Data/printers.json
```

The diff must be one line changed, one line added — nothing else. Confirm the
printer delta is still `81/78` by re-running Step 1.

- [ ] **Step 4: Run the iOS suite** (macOS only — not runnable from a Linux
  container). XCTest must be green; `BrandPickerView` has no test pinning the
  primary set, so this is a regression check, not a proof of the feature.

- [ ] **Step 5: Simulator check** — six brands in the 2-column grid (3 rows),
  Elegoo present, scrolling intact.

- [ ] **Step 6: Commit locally.** Do **not** push — the iOS push gate holds
  until a ship-ready train. This rides the next release.

**This is now the delivery path for iOS** (owner decision 2026-08-11, design §4
Outcome). Elegoo reaches iOS users when the next train ships, so it belongs in
that train's scope and its release notes — it is not a silent data change. Track
it in the next-session scoping task alongside #32.

---

## Phase 3 — iOS overlay (route R3) — ❌ DECLINED 2026-08-11, DO NOT EXECUTE

**The owner declined this route on 2026-08-11.** Elegoo ships bundled in the next
iOS release train instead (Phase 2), combined with other features. Do not raise
`min_app_version`, do not add a brand row to the overlay, and do not build the
`--upsert-brand` mode — it would have no consumer.

The tasks below are retained as the record of what the route would have required
and why it was rejected. **Executing any of them without a fresh owner decision
is out of scope.**

**Original precondition (never met):** the owner has read 1.0.3 + 1.0.4 activity
on `/analytics` and explicitly accepted raising `min_app_version` `1.0.3 → 1.0.5`
as a standing change. Design §4 R3 and §8.

### Task 4: Answer the version question

- [ ] **Step 1:** On `/analytics` (admin token required), query release health
  over a 90-day window and record combined `app_version` activity for `1.0.3`
  and `1.0.4`.

- [ ] **Step 2:** If non-zero — **stop. R3 is declined**, Elegoo ships via
  Phase 2 on the next train. Record the number and the decision in the session
  log. This is a legitimate outcome, not a failure.

### Task 5: Add a brand-only republish mode (TDD)

**Files:** Modify `scripts/republish-overlay.js`, `scripts/republish-overlay.test.js`

**Rationale:** design §5 — no existing mode can express a brand-row publish.
`--add-brand` is a rider on `--add-printer` and only appends absent brands.

- [ ] **Step 1: RED.** Write tests first for a new `--upsert-brand <id>` mode:
  publishes a brand row from `data/printers.json` when absent; **replaces** it
  when present with different fields; **no-ops without version churn** when
  byte-identical (mirroring the existing printer no-op at `:135-137`); fails
  loudly on an unknown brand id. Confirm RED.

- [ ] **Step 2: GREEN.** Implement, reusing `nextVersion`, `freshEnvelope` and
  `writeValidated` so version rules and the ship validator still gate every
  publish. No hand-edited overlay, no hand-computed hash.

- [ ] **Step 3: Commit** the tool change separately from the publish.

### Task 6: Raise min_app_version and publish

- [ ] **Step 1:** Set `min_app_version` to `1.0.5` and run the new mode for
  `elegoo`. Confirm `content_version` advances by the `YYYYMMDDXX` rule and
  `payload_sha256` is recomputed by the script.

- [ ] **Step 2:** Ship gate:

```bash
node scripts/validate-ios-printer-overlay.js
```

Expect a PASS naming 3 brands and `collision-checked vs baselines: none`.

- [ ] **Step 3:** Publish, then verify live:

```bash
node scripts/verify-live-overlay.js
```

- [ ] **Step 4: Device check.** On an install at or above 1.0.5 that has already
  cached an older overlay, confirm Elegoo appears in the primary row after the
  fetch — the override-merge path (`PrinterCatalogProvider:309-326`) is what is
  actually being proven, and it has never been exercised for a brand row.

- [ ] **Step 5:** Record in the session log that overlay delivery to 1.0.3/1.0.4
  has permanently ended, with the activity numbers that justified it.

---

## Verification summary

| Gate | Phase | Expected |
|---|---|---|
| `validate-data.js` | 1 | pass |
| `walkthrough-harness.js` | 1 | pass |
| `engine-golden-snapshot.js --check` | 1 | **NO DRIFT** |
| Browser, desktop + 320px | 1 | 6 chips, none clipped |
| Web/iOS printer delta still 81/78 | 2 | unchanged |
| iOS XCTest | 2 | green |
| Simulator brand grid | 2 | 6 brands, 3 rows |
| `republish-overlay.test.js` | 3 | RED → GREEN |
| `validate-ios-printer-overlay.js` | 3 | pass, `baselines: none` |
| `verify-live-overlay.js` | 3 | live payload matches |

## Rollback

- **Web:** revert the one-line commit; Cloudflare redeploys from `main`.
- **iOS bundled:** revert the local commit before the train ships.
- **Overlay:** `republish-overlay.js --rollback-to <snapshot>`, which applies the
  PD6 version floor. Take a `--snapshot` **before** Task 6 so this path exists.
