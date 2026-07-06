# IMPL-044 W3/W4: Mine tier, journal harvesting, and custom filaments — design spec

**Status:** DESIGN (2026-07-06, learns-export session, branch `learns-export-20260706`)
**Relationship to IMPL-044:** `IMPL-044-profiles-workshop.md` stays the umbrella (goal, phasing, non-goals). This spec is the detailed W3/W4 design it deferred, same pattern as the S1–S5 topic specs. Where this spec refines or overrides an umbrella lean, it says so explicitly.
**Build status this session:** ONLY the app-layer journal-harvesting slice (§4) is implemented now (gate B3). The Mine-tier engine injection (§5) and custom filaments (§6) are DESIGNED + PLANNED here and built in a later engine train.
**Companion:** `docs/planning/LEARNS-EXPORT-GATE-LEDGER.md` · plan `docs/superpowers/plans/2026-07-06-impl-044-w3w4-plan.md` (gate B2).

---

## 1. Goal

Close the learning loop the Workshop opened: W2 journals record what worked and what failed; W3 turns accumulated outcomes into explicit, bounded, accept-or-dismiss tuning suggestions that become a third profile tier (**Safe / Tuned / Mine**); W4 lets users encode their own spools as validated `user_*` material overlays. No ML, no telemetry, no accounts — mechanical rules over local data, every applied change visible and attributable.

## 2. Non-goals

- No automatic application of any offset. Suggestions are proposals; only explicit acceptance changes output, and only in Mine mode.
- No free-form parameter editor; offsets come from a fixed, bounded vocabulary (§3.4).
- No parsing of troubleshooter display prose for magnitudes (that is IMPL-043's root-cause sin; magnitudes are structured data here, §3.3).
- No community submission (W5 stays its own future spec).
- W3/W4 v1 makes no attempt to combine Mine with Tuned (§5.2).

## 3. The harvest model (journal → suggestion)

### 3.1 Input and grouping

Input is the Workshop envelope (`3dpa_workshop_v1`): every saved profile's `journal[]` of `{id, result: 'worked'|'failed', symptoms[troubleshooter ids], note, date}` records (W2 shape, `workshop-store.js:86`). Harvesting groups outcomes by **printer + material pair** taken from each profile's saved `state.printer` / `state.material` — the pair is the unit a physical tuning fact belongs to (nozzle intentionally NOT in the key: temp/adhesion behavior is dominated by printer+material, and splitting by nozzle would starve the counters; the suggestion card displays which nozzles the evidence came from).

Per pair, per symptom id, compute: `failed` (count of failed outcomes tagged with that symptom), `worked` (count of worked outcomes for the pair), `lastDate` (newest contributing outcome). Outcomes with result `failed` and zero symptom tags contribute to nothing (no signal, no guess).

**Unknown ids:** a pair whose printer or material id is not resolvable in the current catalogs (retired printer, deleted `user_*` material) is SKIPPED at harvest — journal data is kept untouched, no suggestion is emitted, and `engineFacts.materialGroup(unknownId)` is never consulted. Accepted tuning entries for an unresolvable pair render greyed-out in "My tuning" (kept, revertible, never silently deleted). (Cold-read finding 10.)

### 3.2 Threshold rules

- A symptom **fires** for a pair when `failed >= 2` for that symptom **and the contributing failures share the same nozzle** (nozzle is the strongest physical confounder for temp/retraction behavior; failures split across nozzles don't count toward one threshold). N=2, not 3: a hobbyist's per-pair print cadence is low; requiring 3 identical failures before the app says anything makes the feature invisible for months. N=1 would react to one-off noise (wet spool, bad STL). The card always shows the evidence count AND the environment spread of the contributing outcomes, so the user judges mixed-context evidence themselves.
- **Positive lock-out:** if the pair has `worked >= 1` with a date NEWER than the newest failure for that symptom, the suggestion is suppressed — the problem appears solved; stale failures don't nag. This is deliberately pair-wide (not nozzle-scoped): it can over-suppress, but over-suppression is the safe failure direction for a suggestion feature. (Codex review C5: residual mixed-context risk accepted with these two mitigations.)
- **Contradiction rule:** scanned over the PRIMARY mappings of all fired symptoms (v1 emits primaries only, so that is the honest scan scope — cold-read finding 6): if two fired symptoms' primaries pull the SAME offset key in opposite directions for the same pair (reachable v1 example: under_extrusion → nozzle temp up vs over_extrusion → nozzle temp down; or warping → bed up vs elephant_foot → bed down), emit NO offset for that key; emit a single `conflict` notice card instead. Honesty beats cleverness; the deep-link into the troubleshooter is the escape hatch.
- **Dismiss re-surface is DATE-keyed, not count-keyed:** a dismissed suggestion returns when a contributing failure NEWER than the dismissal date exists (count-keying breaks when the user deletes old journal entries — `removeOutcome` is a real path, cold-read finding 12).
- **Accept has the same anti-ride gate:** after an accept, no further suggestion for that pair+offsetKey+symptom until a failure NEWER than the accept date exists. Without this, the same two failed prints could be chain-accepted straight to the cumulative clamp in one sitting with zero new evidence (cold-read finding 3).
- **Known limitation (stated, not solved):** offsets cannot detect non-parameter root causes — wet filament, dirty bed, clogged nozzle, bad Z-offset. Mitigation is copy-level and mandatory: every suggestion card carries a "rule out the mechanical causes first" line deep-linking the symptom into the troubleshooter (whose rank-1 causes are usually mechanical), and nothing applies without explicit acceptance.

### 3.3 Where offset magnitudes live (decision)

**Decision: a dedicated app-layer rules table, `workshop-tuning-rules.js`, keyed by troubleshooter symptom id — explicitly TRANSITIONAL, for gate B3 only.** Structured `remedy` blocks inside `data/rules/troubleshooter.json` are the correct long-term home (Codex review C9: iOS W3 will be a second consumer, so "app-layer, one consumer" only holds this session), but they are a `data/` change and this session's B3 gate is app-layer-only by hard rule. So: (a) B3 ships the table app-side; (b) the W3 **engine train commits to migrating** the magnitudes into structured `remedy` blocks in troubleshooter.json (that train opens `data/` anyway), after which `workshop-tuning-rules.js` becomes a thin reader over engine-exposed remedy data and the iOS Workshop consumes the same source. Until then, table entries carry a `sourceRef` naming the troubleshooter cause they operationalize (e.g. `stringing/rank2`), and a Node test asserts every rules-table symptom id exists in `troubleshooter.json` (existence only — direction/magnitude drift is accepted as a transitional risk, closed by the migration).

### 3.4 The offset vocabulary (bounded, closed set)

| Offset key | Unit | Step | Cumulative clamp | Fired by |
|---|---|---|---|---|
| `nozzle_temp_delta` | °C | ±5 | −15 … +15 | stringing (−), layer_separation (+), under_extrusion (+), over_extrusion (−) |
| `bed_temp_delta` | °C | ±5 | −10 … +10 | warping (+), elephant_foot (−) |
| `fan_delta_pct` | % points | ±10 | −20 … +20 | layer_separation (−), stringing PETG-only (+) |
| `retraction_distance_delta` | mm | +0.2 | 0 … +0.6 | stringing (+) — **excludes group TPU** (troubleshooter: long retraction jams flexibles; TPU stringing is usually moisture → TPU gets a dry-the-filament advice card instead) |
| `speed_multiplier_delta` | × | −0.1 | −0.3 … 0 | ringing (−), tpu_jam (− TPU-only) |

Two symptoms map to **advice cards** (kind `advice`, no offset): `first_layer` (the troubleshooter's first-layer guidance is "check the material's range / adhesion basics", not a blanket bed bump — the explicit +5°C guidance belongs to warping; Codex C8) and `stringing` on TPU (above). Advice cards carry the troubleshooter deep-link and no Accept button.

Each rules-table row: `{symptomId, offsetKey, direction, step, clampMin, clampMax, materialGroups (null = all), excludeGroups, sourceRef, why}`. One symptom may map to at most TWO offset keys (primary + secondary, e.g. stringing → retraction primary, temp secondary), ranked like the troubleshooter's own cause ranking; v1 suggests only the primary, and the card mentions the secondary as "if this doesn't help". Material-conditioned rows (PETG fan, TPU speed) apply only when the pair's material belongs to the named group. A warping→fan row was considered and DROPPED: troubleshooter.json's warping causes contain no cooling/fan cause, so the row would violate this section's own sourcing invariant (cold-read finding 7). `sourceRef` is load-bearing: the Node test resolves each row's sourceRef to an ACTUAL cause entry (symptom id + a cause whose `setting` matches the offset's target family), not mere symptom existence.

Steps and clamps are drawn from the troubleshooter's own remedy guidance (5°C increments, 0.2mm retraction steps, 40–60% PETG fan band) — the numbers users would reach by following the troubleshooter manually. The clamp is a hard ceiling on CUMULATIVE accepted offsets per pair+key, enforced at accept time AND re-enforced at (future) engine-injection time.

### 3.5 Suggestion object shape

```js
{
  key: `${printerId}|${materialId}|${symptomId}|${offsetKey}`,  // identity for accept/dismiss
  printerId, materialId, symptomId, offsetKey,
  step: -5, unit: '°C',                    // this suggestion's increment
  cumulativeAfterAccept: -5,               // what the pair's total would become
  evidence: { failed: 2, worked: 0, lastDate: '…', nozzles: ['std_0.4'] },
  kind: 'offset' | 'conflict' | 'advice',  // conflict cards carry conflictingSymptoms[] instead of step; advice cards carry adviceKey + no step
}
```

Suggestions are a PURE recomputation from (journals × rules table × accept/dismiss ledger) — never stored themselves. Re-running the harvest is idempotent; there is no suggestion queue to migrate.

### 3.6 Accept / dismiss persistence

New optional top-level `tuning` object in the Workshop envelope (additive; W1-era envelopes remain valid):

```js
tuning: {
  // Operation log is the source of truth; `value` is a derived cache.
  accepted: [ { pairKey: 'x1c|pla_basic', offsetKey: 'nozzle_temp_delta',
                value: -5, unit: '°C',           // derived: sum of ops, clamped per §3.4
                ops: [ { opId: '<uuid>', kind: 'accept', step: -5, symptomId: 'stringing', date },
                       { opId: '<uuid>', kind: 'revert', step: +5, date } ] } ],
  dismissed: [ { key: '<suggestion key>', date } ]   // date-keyed: re-surface when a newer failure exists (§3.2)
}
```

- **Every mutation is an operation with a unique `opId`** (accepts AND reverts). The cumulative `value` is always recomputed as `clamp(sum(ops.step))` — never edited directly. (Codex review C2: value-merging across backup forks double-applies; op-merging cannot.)
- **Accept** appends an accept-op (clamped; an accept that would exceed the clamp is not offered — the harvest stops emitting that suggestion at the clamp).
- **Remove/rollback** (the "My tuning" × affordance) appends a compensating revert-op; history is never deleted.
- **Dismiss** suppresses that suggestion key until a contributing failure NEWER than the dismissal date exists (see §3.2 — date-keyed, robust to journal deletions). This is the anti-nag rule and it is test-pinned.
- Accepted values are today CONSUMED BY NOTHING in the engine (§5 is unbuilt); they are the durable input the Mine tier will read.
- `exportJSON`/`importJSON` carry `tuning`; import merge is **op-union**: per pair+offsetKey, union the two op sets by `opId`, sort by date, recompute `value`, re-clamp. Dismissed entries union by key keeping the NEWER date. Lossless under backup forks (independent accepts on two devices both survive), idempotent (re-importing the same backup is a no-op), and can never silently un-dismiss or double-apply.

### 3.7 Never silently applied

Nothing in this pipeline changes `resolveProfile` output today. Even after the W3 engine train, offsets only act in explicit `mine` mode (§5), and every affected value renders with `personal` provenance. The suggestion card copy always names the evidence ("2 failed prints tagged stringing since <date>").

## 4. To build in gate B3 (this session, after this spec + the B2 plan are reviewed): the harvesting layer

Nothing in this section exists yet at spec time. App-layer only:

- **`workshop-tuning-rules.js`** — the §3.4 table + accessors. No logic beyond lookup/validation.
- **`workshop-tuning.js`** — `createWorkshopTuning(store, rules, engineFacts)`: `harvest()` → suggestions per §3.1–3.5; `accept(suggestion)` / `dismiss(suggestion)` → §3.6 mutations via the store; `acceptedFor(printerId, materialId)` → cumulative offsets (the future engine-train consumption point). `engineFacts` is a thin injected adapter `{materialGroup(id)}` so the module stays engine-load-free in Node tests.
- **`workshop-store.js`** — additive `tuning` envelope section + merge rules in `importJSON` + inclusion in `exportJSON`.
- **Workshop UI (`app.js`)** — "Suggestions" section in the Workshop view: offset cards (evidence line, Accept / Dismiss), conflict cards (troubleshooter deep-link), "My tuning" list of accepted cumulative offsets with remove. EN+DA keys for all copy.
- **Node tests** (`scripts/workshop-tuning.test.js`, picker-dry-run style, RED first): threshold fire/no-fire incl. same-nozzle requirement, positive lock-out, contradiction suppression (primary-scope), clamp stop, dismiss suppress + DATE-keyed re-surface (incl. the delete-old-outcomes case), accept accumulate + clamp + anti-ride gate (no re-suggestion without a newer failure), advice-card rows (first_layer, TPU stringing) emit no offset, material-conditioned + excluded groups, unknown-id pairs skipped, op-based import merge (fork-lossless, idempotent re-import, revert ops survive), envelope backward-compat (W1-era envelope → harvest runs, no crash), every rules-table `sourceRef` resolves to an actual troubleshooter cause whose `setting` matches the offset family.

Hard line, enforced by the gate: no `engine.js` change, no `data/` change; golden snapshot diff must be EMPTY.

## 5. W3 — the Mine tier (engine design; NOT built this session)

### 5.1 Injection surface

Two structurally different value families need offsets, so the injection has two limbs, both fed from `acceptedFor(printer, material)`:

1. **Material-derived values (temps, fan, retraction).**
   - **Temps:** computed in `getAdjustedTemps` (engine.js:1154) and `getAdvancedFilamentSettings` (engine.js:1218 area) as `base + env adjustments`, then clamped to printer caps. Personal temp deltas join AT THE SAME POINT as env adjustments (`nozzle_temp_base + env.nozzle_adj + … + personal.nozzle_temp_delta`), BEFORE the existing clamp lines — so the existing UPPER caps (`min(material.*_max, printer.max_*)`) bound personal overshoot with zero new code. **The LOWER bound is new code** (cold-read finding 2): every existing clamp is `Math.min` — nothing today clamps a temperature downward, because env adjustments never pushed below material minimums the way a cumulative −15°C personal delta can. The W3 train adds explicit floors at the injection points: nozzle ≥ `material.nozzle_temp_min` (the troubleshooter's own "stay above minimum rated temp"), bed ≥ `max(0, bed_temp_base − 10)` as the conservative floor absent a data-level bed minimum. Test-pinned in §5.4.
   - **Fan:** `fan_delta_pct` adds uniformly to exactly three emissions: `fan_max_speed`, `fan_min_speed`, `cooling_fan_overhang` (the env-scaled values at engine.js:1248-1260 + the profile fan path ~2657). **There is NO existing 0–100 clamp to reuse** (today's values stay in range only because bases are bounded and the env multiplier is ≤1 — Codex review C4 / cold-read finding 4): the W3 train adds explicit `max(0, min(100, v))` bounds at each of those three points, test-pinned.
   - **Retraction:** the nozzle/Bowden scaling lives in `resolveProfile` (`_scaleRetraction`, engine.js:2608-2633) — NOT in the advanced-filament surface, which emits the raw base (engine.js:1277; Codex review C3). `retraction_distance_delta` therefore applies INSIDE resolveProfile's retraction block: after `_scaleRetraction`, before the existing `material.retraction_max` cap (engine.js:2616), then floored at 0. The delta means "final scaled value + X mm" — what the user physically dialed. Export consistency is a cross-track dependency: it arrives when IMPL-043 P1 makes export read the scaled resolved value (HIGH-001 fix) instead of the raw base; the W3 train must land AFTER that refactor (sequencing note for the plan).
2. **Objective-profile fields (speed/accel multipliers).** `_tier(preset, field, mode)` (engine.js:77) gains a third layer: mode `'mine'` first consults an engine-held `_personal` sparse-overrides object (same shape as `_tuned`: absolute field values, materialized by the engine from `speed_multiplier_delta` against the Safe base at injection time), else falls through to the SAFE value. Precedence within mine mode: personal > safe. `_personal` is set via a new public API `Engine.setPersonalTuning({pairKey, offsets})` called by the app before resolve; passing `null` clears it. When `_personal` is empty, mode `'mine'` resolves byte-identical to `'safe'` (walkthrough-pinned).

**Stale-injection guard (both limbs — Codex C10 / cold-read finding 9):** the injected payload's `pairKey` is validated by the ENGINE at every resolve against `${state.printer}|${state.material}`. On mismatch the entire personal layer is ignored for that resolve (output = safe) — a missed re-injection after a printer/material switch can therefore never silently apply another pair's offsets. Walkthrough-pinned in §5.4.

**Advanced-surface consistency note (cold-read finding 5):** `getAdvancedFilamentSettings` displays retraction UNSCALED today (engine.js:1277, a pre-existing HIGH-001-family inconsistency). The W3 train must not widen it: the suggestion card and "My tuning" always describe the delta in final-output terms (post-scale), and §5.4 pins resolved-profile retraction == exported retraction (via IMPL-043 P1) == card arithmetic.

### 5.2 Mine composes with Safe, not Tuned (decision)

`mine` = Safe base + personal deltas. Not Tuned base: the user's journal evidence was gathered against what they actually printed (overwhelmingly Safe, the default), and stacking community-consensus overrides under personal deltas would make the provenance story ("this number is yours") false for the untouched fields' neighbors. The umbrella spec's "structurally identical to `_tuned`" holds for limb 2's mechanism; this section refines the BASE the deltas apply to. Tuned+personal composition is explicitly out of scope for v1 and would need its own evidence model.

### 5.3 Mode plumbing + provenance

- `profileMode` gains `'mine'`; the app offers it only when `acceptedFor(state.printer, state.material)` is non-empty (existing Safe/Tuned segmented control grows a third segment conditionally; iOS `SlidingSegmentedControl` likewise on its train).
- Every value a personal delta touched carries `prov: { source: 'personal', ref: 'workshop tuning: <offsetKey> <±value><unit> (accepted <date>)' }` — rendered by the existing `_prov` sidecar UI unchanged. `source: 'personal'` joins the documented provenance vocabulary (engine.js:42 comment block).
- Share URLs: a shared state with `profileMode:'mine'` degrades to `safe` on the recipient (their Workshop lacks the sender's tuning; StateCodec validation maps unknown/unavailable mode → safe). v1 degrades SILENTLY — StateCodec has no notice hook today (Codex C11); a restore-notice is a UI nicety for the W3 train, not asserted behavior. Personal offsets NEVER ride share URLs.

### 5.4 W3 test gate (engine train)

Walkthrough additions (RED-first): mine==safe when no overrides; temp delta applies and CLAMPS at printer cap (case constructed to exceed cap); temp delta FLOORS at material minimum (negative-delta case — new lower-bound code); fan delta bounded 0–100 on all three named emissions; retraction delta post-scale + `retraction_max` cap + ≥0 floor; `_tier` mine-mode fallthrough to safe (not tuned); pairKey mismatch → whole personal layer ignored (output byte-equal safe); provenance `personal` present on touched params and ONLY those. Matrix-audit unchanged for safe/tuned (mine additive). Golden snapshot: regenerate; deltas must be exactly the new mine-mode states added to the matrix. iOS: byte-identical sync + XCTest mirrors of each walkthrough addition. validate-data untouched (no data change in W3 — `_personal` arrives via API, not data files).

## 6. W4 — custom filaments (design; NOT built this session)

- **Registration:** new public API `Engine.registerUserMaterials(list)` callable after `init()`; entries are FULL material objects produced by "clone closest template" in the Workshop UI, ids forced to `user_<slug>` namespace. Registration re-validates every entry (below) and REPLACES the previous user set (idempotent; no accumulation bugs). Canonical ids can never be shadowed: a `user_*` prefix is structurally incapable of colliding, and registration rejects any entry whose id lacks the prefix.
- **Validation (app-layer mirror of validate-data's material checks):** required fields present; numeric ranges (nozzle/bed temps within global sanity bands, e.g. nozzle 150–450°C); `group` must be one of the existing material groups (inherits that group's warning behavior — a user PLA gets PLA heat-creep logic). Invalid entries are rejected with per-field errors at the UI, never partially registered.
- **Cannot silence warnings:** warnings and clamps read the registered values through the SAME paths as canonical materials (IMPL-039 `getPrinterLimits`/`_clampNum`), so a user material claiming bed 200°C still clamps to the printer cap and still fires the cap warning. There is no field a user material can set that suppresses a warning class — test-pinned.
- **Storage:** Workshop envelope gains `userMaterials: []` (additive, rides backups like `tuning`). App registers them at boot after `Engine.init()`.
- **Share URLs (decision — refines the umbrella's lean):** custom filaments are **EXCLUDED from share URLs**. Each stored user material carries a mandatory `templateId` (the canonical material it was cloned from); the share codec substitutes `templateId` for the `user_*` id at ENCODE time on the sender's side, so the recipient receives a URL that resolves without any knowledge of the sender's Workshop (cold-read finding 8 — recipient-side degradation is unresolvable, sender-side substitution is exact). The umbrella leaned toward inlining as payload; rejected at design: (a) inlined material payloads are an injection surface for values the recipient never chose (trust + safety review burden); (b) spool names may carry personal info (privacy stance); (c) URL length. The Workshop backup file is the intended transfer channel — it is explicit, whole, and user-initiated.
- **Provenance:** all values from a user material carry `prov: { source: 'user', ref: 'My filaments: <name>' }`.
- **W4 test gate:** validate-data-class checks on the app validator (Node tests); walkthrough: registered `user_*` material resolves/clamps/warns like canonical + cannot shadow + re-registration idempotent; golden regen additive-only; iOS train mirrors.

## 7. Web + iOS impact evaluation (mandatory)

| Change | Web | iOS |
|---|---|---|
| B3 harvesting (this session) | Workshop UI suggestions section + store `tuning` (lands on the work branch at gate B3; nothing exists at spec time) | **None now.** iOS Workshop has no journal (I3 deferral) → no harvest input exists on iOS. The iOS `WorkshopStore` ordered emitter does NOT yet preserve the new optional `tuning`/`userMaterials` envelope keys — a web backup round-tripped THROUGH iOS export would drop them. Accepted as a known, narrow gap this session (the web is the only writer of those keys; iOS is not a backup editor in any current flow); the iOS W3 train MUST add key-preservation + regenerate the byte-compat fixture. Recorded as a MUST-ITEM in the B2 plan's iOS section. |
| W3 Mine tier (future train) | Third segment in mode control (conditional); provenance chip already renders sidecars | Engine byte-sync + `SlidingSegmentedControl` third segment + XCTest mirrors; same conditional-visibility rule |
| W4 custom filaments (future train) | Material picker "My filaments" group; add/edit/validate UI | Same surface in SwiftUI; registration call in EngineService bootstrap |

## 8. Standing-rules check

- engine/app separation: B3 entirely app-layer; W3/W4 add engine APIs (injection/registration), no UI in engine.
- Web is master; iOS mirrors byte-identical on the engine train; per-platform UI.
- Data/logic-change eval: §7. One finding = one commit; iOS push gate: unchanged.
- Privacy: all data local; nothing new leaves the device; share URLs exclude personal tuning + user materials by design (§5.3, §6).
- Provenance everywhere: new `personal` and `user` sources ride the existing `_prov` machinery.
- Locked-schema additivity: envelope changes additive; W4 material entries are full valid objects in an isolated namespace.
- No silent application, quality over speed: thresholds, clamps, contradiction suppression, and accept/dismiss are all test-pinned before any engine work starts.
