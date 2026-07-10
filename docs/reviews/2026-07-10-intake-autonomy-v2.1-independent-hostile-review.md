# Intake Autonomy v2.1 — independent adversarial hostile review (Task 1, leg 1 of 2)

**Date:** 2026-07-10
**Target:** [`docs/superpowers/specs/2026-07-10-intake-autonomy-v2.1-evidence-retry-retrospective-design.md`](../superpowers/specs/2026-07-10-intake-autonomy-v2.1-evidence-retry-retrospective-design.md) (DRAFT v4).
**Reviewer:** independent hostile sub-agent, brief = *"find the holes in the cheese, validate every claim, do NOT approve"* — deliberately uncorrelated from the two prior Codex passes (§12, §13). Findings spot-verified against the in-tree source by the controller.
**Verdict:** **NO-GO.**

> **Environment note — this is only HALF of Task 1.** The cold-start Task 1 requires BOTH an independent hostile pass AND a Codex cross-model pass. This session ran in the **cloud** environment, which has **no `bridge`/`codex` CLI and no `ai-operating-model` sibling repo**, so the Codex leg **could not run**. It is still owed and must run in a **local** session before Task 1 can be declared clear. Given the arc's K1 finding (a single reviewer's fix launders a defect; round-2 Codex refuted round-1 Codex), do **not** apply these findings to the spec without the cross-model cross-check.

---

## Verdict rationale

The spec's headline safety claim — **criterion 3: "no path exists from any NO-GO verdict to a review turn"**, guarded by the NO-GO-taint invariant plus a taxonomy-graph reachability test — is **defeated by two paths that lie outside the tested subgraph**, and the taint's own derivation is unimplementable on the one real artifact it must migrate. The spec's own thesis ("enumerating per-lane rules does not work; three drafts reintroduced the ratchet in three places") is vindicated a **fourth** time: the v2.1 enforcement (`intake-parked-store.js` refusal list) and the reachability test both enumerate lanes, and both miss lanes.

---

## Findings

### F1 — CRITICAL. Taint guards the *retry* path but not the *fresh-intake* path: a NO-GO'd printer is re-reviewed simply by being re-requested.
**Claim: criterion 3 "no path from any NO-GO to a review turn" — FALSE. CONFIRMED in code.**

Taint lives in a *parked sidecar's* `verdictRefs`, keyed per `candidateKey`. Enforcement is (a) `intake-parked-store.js` refusing tainted writes and (b) a taxonomy-graph test over park-reason → lane → review edges. **Neither touches the normal intake path.**

- `loadCatalog` reads its dedupe/id indexes from **`data/printers.json` only** (`scripts/printer-intake-scout.js:308-309`; indexes built `:335-347`). There is **no** lookup against parked sidecars anywhere in catalog loading.
- A printer parked `review-no-go` was **not shipped**, so it is **absent from `data/printers.json`**. A re-submission ("Creality K2 SE" again — users re-request missing printers constantly; the Scout even tracks `requestCount`) is therefore `needs-research`, mints a **fresh candidate skeleton**, and flows Scout → research (3) → evidence gate (3b) → **review turn (5)**, shipping on `{GO,GO}`.
- The prior NO-GO is never consulted: the ship path deletes staging and writes no sidecar, so the store write-guard never fires; the graph test can't catch it because a fresh candidate is not a node in the taxonomy — it enters at stage 3, upstream of every edge the test enumerates.

This is the **cheapest possible laundering** of a NO-GO: no forged excerpt, no migration trick, no timer — just re-submit. It sidesteps RD3, RD3-novelty, the store guard, and the headline test at once. It also directly contradicts §8 criterion 1 (the "K2 SE end-to-end acceptance test" *expects* a fresh candidate to ship or re-park).

**Fix:** key taint by **printer identity**, not `candidateKey`; consult a printer-id-level prior-NO-GO index **before any review turn is spent** (Scout emits it, or stage 3 checks it) → a hit routes to `decision-required`/owner regardless of a fresh `candidateKey`. Extend the reachability test to include the **fresh-intake entry edge**, not only retry-lane edges.

### F2 — HIGH. `transient-pipeline` (`main-moved`) is not in the taint deny-set; it hands a tainted candidate immediate ×2 evidence-free review turns.
**Claim: RD5 store-guard enforces "tainted only in judgment-on-evidence/decision-required" — FALSE/incomplete. CONFIRMED in spec text.**

The invariant's positive clause says a tainted candidate "may occupy **only** `judgment-on-evidence` or `decision-required`." The *enforcement* (RD5 line 169; test line 260) enumerates only **three** forbidden classes and **omits `transient-pipeline`** (RD2 table line 116: `main-moved | immediate | ×2`). A tainted candidate re-attempted under a sanctioned owner instruction, if `main` advances mid-attempt, parks `transient-pipeline` (accepted by the store) and is then entitled to immediate ×2 rebased re-attempts through the merge gate — timer-free, evidence-free samples. `main-moved` is neither new external evidence nor an owner instruction. The exact failure mode the fix claims to abolish, committed inside the fix.

**Fix:** the store must refuse a tainted write into **every** class except `judgment-on-evidence`/`decision-required` — derive the deny-set **from the invariant**, not a hand-maintained list. Assert the same over `transient-pipeline` in the graph test.

### F3 — MEDIUM. `tainted` cannot be "derived from verdictRefs" for migrated v1 sidecars — the v1 schema has no `verdictRefs`.
**Claim: RD5 "tainted: monotone; derived from verdictRefs, never hand-set" — FALSE for the migration path. CONFIRMED (schema logic).**

`verdictRefs` is a v2 addition (`intake-parked@2`). Every legacy `intake-parked@1` sidecar — including K2 SE — has **no `verdictRefs`**. Mechanical `verdictRefs.some(v => v.verdict === "NO-GO")` evaluates **false** on every v1 sidecar. The spec taints K2 SE by a **hand rule** ("its sidecar is `review-no-go` ⇒ tainted") reading the v1 `reason`, contradicting "never hand-set" — and any migrator trusting the stated derivation migrates K2 SE **untainted**, re-opening the §13-must-fix-1 laundering.

**Fix:** migration derives taint from the v1 `reason` (`review-no-go`, `review-split`, any `*-no-go*`), writes the derived `verdictRefs`, and is unit-tested against the real v1 K2 SE fixture asserting `tainted === true` from `reason` (with `verdictRefs` empty).

### F4 — MEDIUM. `unverified-model` — a first-class runbook outcome with a prior v2 policy — is unmapped in RD2; it rides the "unrecognised → decision-required" catch-all, regressing v2 autonomy and falsifying criterion 4.
**Claim: criterion 4 "no park reason lacks a class" — FALSE. CONFIRMED in spec text.**

`unverified-model` is a defined assisted outcome (runbook `:197`, per the audit) and had an explicit v2 policy (this spec line 45: "`unverified-model` → weekly ×4 then expire"). RD2's table (109-116) never lists it, so it classifies as "any unrecognised reason → `decision-required`" — but it is **not** unrecognised; it is a known, environment-dependent reason (`world-absent`-shaped: a timer genuinely re-queries the world). Routing it owner-only both **regresses** v2's autonomous weekly re-query and **mischaracterises a known reason as unknown**.

**Fix:** map `unverified-model` explicitly → `world-absent` (with the recorded source sweep), or state deliberately why it is demoted. Do not let a known reason ride the unrecognised catch-all.

### F5 — MEDIUM. RD3's canonical-source novelty cannot canonicalise unknown mirrors, archive snapshots, shorteners, or PDF-vs-HTML — so "already-rejected" content re-enters as "novel" and spends a review turn.
**Claim: RD3.2 "re-citing what the reviewer already rejected … is not an answer" — OVERSTATED.**

The normaliser is deterministic and offline (§7 "fixtures only") and resolves only **known** mirrors. Cheaper than fabricating an excerpt: the rejected `creality.com/products/k2-se` re-cited as a `bit.ly` shortlink (offline gate can't follow the redirect); as a `web.archive.org/…` snapshot (novel unless the archive prefix is explicitly stripped); or as a PDF of the same HTML / a second real manufacturer page repeating the same rejected figure — each is *canonically* novel but *semantically* the source the reviewer already rejected, buying a stochastic review sample. RD3's "honest limits" cover fabrication but *assert* the novelty check blocks re-citation; against a knownlist normaliser that is false for un-listed transforms.

**Fix:** downgrade the claim to what a deterministic offline normaliser can do; add a **content hash of the fetched excerpt** to the novelty baseline (catches the same text from a new URL); treat archive/shortener/reseller-mirror hosts as **non-novel by default** (denylist), not novel by default.

### F6 — MEDIUM. RD10's "exactly-recognised" custody pass is under-specified and validates paths/subject but never content.
**Claim: preflight fail-closes on dirty AND ahead!=0 — VERIFIED (`scripts/intake-run-preflight.sh:45-53`); the *relaxation* is not "exactly-recognised" as claimed.**

Gaps in "the *only* modified paths are the two named files": (a) **subset** — a crash between the two writes leaves only one file dirty; if the pass requires *both* it fail-closes on a single-file state — the very deadlock Codex-#2-must-fix-3 removed; the spec never says subset is tolerated. (b) **untracked** — `docs/printer-provenance.json` is not yet tracked (build item, and confirmed absent from git in this tree), so its first write shows as `??` untracked, not ` M`; a modified-tracked-path whitelist misses it. (c) **non-atomic append** — a torn `.jsonl` append yields a truncated final line the path-check still "recognises," committing corrupt JSONL. (d) **non-runner authors** — the runbook has the **owner** hand-edit `printer-intake-outcomes.jsonl` (PD7 marker migration); path+subject is a heuristic, not an identity.

**Fix:** define the pass over the *set* of custody paths (any non-empty subset), handle untracked state, and have the runner re-parse/validate the committed ledger+provenance before advancing the watermark. State plainly that content is unverified by the preflight.

### F7 — MEDIUM (SCOPE). The `research-defect`/`world-absent` split is speculation at N=1; the minimal v2.1 is ~3 components, not ~10.
The one live defect is D1 (sources not recorded). Its load-bearing fixes are RD1 (evidence gate) + RD10 (provenance file) + the reviewer structured-objections contract. D3 (weekly re-roll of a NO-GO) is fixed minimally by the **already-shipped** §14(a) contract patch (v1.1 = `review-no-go` event-only + fail-closed on unknown; gate R0). Everything else in the retry taxonomy is designed for candidate types that **have never occurred** (N=1 parked one `review-no-go`, zero `research-defect`, zero `world-absent`). The distinct bounds, the "recorded complete source sweep" precondition, and the deterministic-repair argument are unfalsifiable until such a park exists — the spec admits "N=1" seven times yet ships the machinery. Credit: RD6 / `intake-run-context.json` *were* deferred; apply the same discipline one level down (fold `research-defect`/`world-absent` into `decision-required` until a real park demands the split). The reachability surface F1/F2 must patrol shrinks accordingly.

### F8 — LOW. §9 risk table still asserts the exact cost claim §13-must-fix-5 overturned.
**Claim: §9 line 289 "second reviewer only on a NO-GO" — FALSE; contradicts RD4 (line 150) and §13#5 (line 340), both "always run both." CONFIRMED.** A settled correction not propagated into the risk table. **Fix:** "both always run; incremental cost over v2 fail-fast is one turn on NO-GO paths."

### F9 — LOW. RD1's Scout build-item undercounts the missing slots vs its own by-reference field set.
**Claim: "Scout skeleton has no slot for extruder_type/max_acceleration (nor chamber/camera/lidar)" — VERIFIED but incomplete.** `scripts/printer-intake-scout.js:710-715` provides `FIELD()` slots for 9 fields (one, `series_group`, isn't profile/safety-critical). Against the runbook's profile/safety list the skeleton is **also** missing `active_chamber_heating`, `max_chamber_temp`, `open_door_threshold_bed_temp`, and `notes`-as-warnings. Since the field set is "by reference" and the gate keys off packet slots, the build item must enumerate the **full** runbook list or the gate silently can't check the omitted fields. **Fix:** derive the slot set programmatically from the runbook field list.

### F10 — LOW. The `allowedPrinterFields` justification is misattributed — that validator gates the *overlay*, not `data/printers.json`.
**Claim: RD10/§6 "provenance can't live in data/printers.json because allowedPrinterFields rejects unknown keys" — VERIFIED as a function property (`validate-ios-printer-overlay.js:19,269`), MISATTRIBUTED.** `validateOverlay` reads the overlay JSON, not `data/printers.json`; a provenance key on a bundled-only row never reaches this validator and iOS `Codable` ignores unknown keys. The **conclusion** (separate provenance file) is sound on RD10's stronger grounds (staging deleted at ship time; no deploy churn), but the cited reason is not load-bearing. **Fix:** cite `validate-data.js` (or the iOS `Codable`/additivity rule) as the actual constraint.

---

## Load-bearing claim audit

| Claim | Status | Evidence |
|---|---|---|
| Scout skeleton lacks `{value,source,confidence}` slot for `extruder_type`/`max_acceleration`/chamber/camera/lidar | **VERIFIED** (undercounts — F9) | `printer-intake-scout.js:662,710-715` |
| `allowedPrinterFields` rejects unknown keys | **VERIFIED**, misattributed (F10) | `validate-ios-printer-overlay.js:19,269` — gates the overlay file, not `data/printers.json` |
| `docs/**` is asset-ignored | **VERIFIED** | `.assetsignore` (`docs`, `docs/**`) |
| Preflight fail-closes on dirty AND `ahead!=0` | **VERIFIED** | `intake-run-preflight.sh:45-47,49-53` |
| Runbook defines app-cap lane + 3-component absence rationale | **VERIFIED** | `printer-addition-protocol.md` |
| Runbook emits **unsuffixed** `needs-source-resolution` | **VERIFIED** | `printer-addition-protocol.md:199` |
| `intake-pipeline-runner.md:234` still carries the ratchet / "v1.1 patch" applied | **UNVERIFIED** | sibling `ai-operating-model` repo absent in cloud |
| K2 SE sidecar `evidence[]` empty, objections free-text | **UNVERIFIED** | `scripts/.intake-runner-state/parked/k2_se/` gitignored/absent |
| `docs/printer-provenance.json` "added" (ROADMAP) | **FALSE in this tree** | not git-tracked, not present; as an RD10 component it should not exist pre-build |
| `tainted` derived from `verdictRefs`, never hand-set | **FALSE** (migration — F3) | v1 schema has no `verdictRefs`; K2 SE taint hand-derived from `reason` |
| Store guard enforces "tainted only in judgment-on-evidence/decision-required" | **FALSE/incomplete** (F2) | omits `transient-pipeline` (RD5:169, table:116) |
| Criterion 3: no path from any NO-GO to a review turn | **FALSE** (F1, F2) | fresh-intake path + `transient-pipeline` bypass the tested subgraph |
| §9: "second reviewer only on a NO-GO" | **FALSE** (F8) | contradicts RD4:150 + §13#5:340 |
| `unverified-model` has a class | **FALSE** (F4) | unmapped in RD2; rides unrecognised catch-all |

**Bottom line:** NO-GO until **F1–F4 are closed structurally** (taint keyed by printer identity + consulted before any review turn; deny-set derived from the invariant; migration taint derived from `reason`; `unverified-model` mapped) and the reachability test is extended to the **fresh-intake and `transient-pipeline` edges**. RD3/RD10 (F5/F6) are directionally sound but oversold; the build is scoped for imagined futures at N=1 (F7). **The Codex cross-model leg still owes a pass** (must run locally) before Task 1 clears — and may refute or add findings, so do not apply these unilaterally.
