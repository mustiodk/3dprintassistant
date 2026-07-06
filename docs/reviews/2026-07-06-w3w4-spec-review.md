# W3/W4 design spec — review notes (gate B1)

**Artifact:** `docs/specs/IMPL-044-W3W4-mine-tier-and-custom-filaments.md`
**Reviews:** (1) cross-model `bridge --mode codex-only` (health-checked first; transcript `bridge-2026-07-06-175337-288464.md` in session scratchpad, findings reproduced below); (2) cold-read hostile sub-agent (fresh context, repo cold-read convention).
**Disposition legend:** APPLIED = spec edited; PARTIAL = adopted with narrower change (reason given); REJECTED = reason given.

## Codex (bridge codex-only) findings

| # | Sev | Finding | Disposition |
|---|---|---|---|
| C1 | MUST | §4 reads as if the harvesting layer already exists ("Built this session"); nothing is built at spec time | APPLIED — §4 retitled/retensed "To build in gate B3"; forward-tense sweep of the section |
| C2 | MUST | Accept/import merge not lossless: "newer-history-wins" drops independent accepts after a backup fork; merging cumulative `value` risks double-apply; removal-by-subtraction has no record | APPLIED — §3.6 redesigned around per-operation ids: `history` entries carry op ids (accepts AND reverts); import merge = union of ops by id → recompute cumulative from ops → clamp. Idempotent, lossless, fork-safe |
| C3 | MUST | Retraction delta claim wrong: nozzle/Bowden scaling lives in `resolveProfile` (engine.js:2608-2633), NOT in getAdvancedFilamentSettings (which emits raw base, engine.js:1277); a delta at the advanced surface would neither pre-scale nor export consistently | APPLIED — §5.1 corrected: retraction delta applies inside resolveProfile's retraction block, after `_scaleRetraction`, before the `material.retraction_max` cap (engine.js:2616); export consistency arrives via IMPL-043 P1 passthrough (export reads the scaled resolved value) — cross-track dependency now explicit |
| C4 | MUST | "Fan bounds reuse existing clamps" is false — no 0-100 clamp exists today (values stay in range only because bases are bounded and env multiplier ≤1) | APPLIED — §5.1 corrected: fan deltas need NEW explicit 0–100 bounds at the emission points; "zero new clamp code" claim now scoped to temps only |
| C5 | SHOULD | N=2 + pair-only grouping mixes contexts (nozzle/env/spool); positive lock-out too broad (one worked print on a different setup suppresses a real failure) | PARTIAL — threshold tightened: the ≥2 failures must share the same nozzle (nozzle is the strongest physical confounder); evidence card must list env spread. Lock-out kept pair-wide: it errs toward FEWER suggestions, which is the safe direction; residual risk documented |
| C6 | SHOULD | Contradiction rule misses non-offset root causes (wet filament, dirty bed, clog) | APPLIED (copy-level) — every suggestion card carries a "check the mechanical causes first" troubleshooter link; limitation stated in §3.2. Offsets remain human-accepted, never auto |
| C7 | SHOULD | stringing→retraction+ unsafe for TPU (troubleshooter itself warns: jams in flexibles; TPU stringing is usually moisture) | APPLIED — retraction row excludes group TPU; TPU stringing yields an advice card (dry the filament), not an offset |
| C8 | SHOULD | first_layer→bed+5 overstates troubleshooter data (the +5 guidance lives under warping, not first_layer) | APPLIED — first_layer becomes an advice-card row (no offset) in v1 |
| C9 | SHOULD | App-layer rules table wrong long-term home; iOS W3 makes "one consumer" false; sourceRef existence test can't catch drift | APPLIED — §3.3 now commits: table is TRANSITIONAL for B3; the W3 engine train migrates magnitudes into structured `remedy` blocks in troubleshooter.json (data/ opens then anyway) and the app table becomes a thin reader |
| C10 | SHOULD | `_personal` can leak across pairs — `_tier()` has no printer/material context; stale `setPersonalTuning` data would affect the next profile | APPLIED — §5.1: injection payload carries `pairKey`; resolveProfile validates `pairKey === state.printer\|state.material` at resolve time, else ignores the whole personal layer |
| C11 | SHOULD | Share-URL "notice" for degraded `mine` mode has no existing hook (StateCodec degrades silently) | APPLIED — §5.3 reworded: v1 degrades silently to safe; notice listed as UI nicety for the W3 train, not asserted behavior |
| C12 | OPT | No inverted offset directions found in §3.4 vs troubleshooter prose | No action needed (confirms table directions) |

## Cold-read sub-agent findings

Verified-clean dimensions first: TRUTH (all line refs, journal shape, W1-envelope claim, and the §7 iOS key-drop claim verified against the actual Swift store) and PARENT-RULE (both umbrella deviations properly flagged). 14 findings:

| # | Sev | Finding | Disposition |
|---|---|---|---|
| CR1 | HIGH | stringing→retraction row would worsen TPU (troubleshooter: jams in flexibles; tpu_jam prescribes 0mm for 85A) | APPLIED (= Codex C7): TPU excluded; TPU stringing → dry-filament advice card |
| CR2 | HIGH | "zero new clamp code" false on the LOWER bound — all existing clamps are `Math.min` caps; cumulative −15°C can push below material minimum | APPLIED — §5.1 temps: explicit floors are NEW code (nozzle ≥ `nozzle_temp_min`, conservative bed floor); §5.4 test added |
| CR3 | HIGH | Accept has no new-evidence gate — same 2 failures chain-acceptable to full clamp in one sitting | APPLIED — §3.2 anti-ride rule: no re-suggestion for pair+key+symptom until a failure newer than the accept date |
| CR4 | HIGH | No existing 0–100 fan bounds (emergent, not enforced); affected fields unnamed | APPLIED (= Codex C4) + the three exact emissions named (fan_max, fan_min, overhang) |
| CR5 | MED | Retraction join point misdescribed; pre-scale delta breaks card-equals-output attribution | APPLIED (= Codex C3): post-scale injection in resolveProfile; card describes final-output delta; advanced-surface consistency note added |
| CR6 | MED | Contradiction example impossible under primary-only emission; scan scope unstated | APPLIED — scope = primaries of fired symptoms; example replaced with reachable pairs (under/over_extrusion; warping vs elephant_foot) |
| CR7 | MED | warping→fan(−) has no troubleshooter cause — sourceRef would dangle; planned test too weak to catch it | APPLIED — row dropped (verified: warping causes = prep/brim/enclosure/bed/first-layer-speed, no fan); test strengthened to resolve sourceRef → actual cause with matching `setting` family. Remaining fan rows re-verified sourced (layer_separation rank 3 "Part cooling fan"; stringing rank 4 PETG fan) |
| CR8 | MED | Share-URL degrade unresolvable on recipient (no templateId anywhere) | APPLIED — `templateId` mandatory on stored user materials; sender-side substitution at encode time |
| CR9 | MED | Stale `_personal` can silently apply another pair's offsets | APPLIED (= Codex C10): engine-side pairKey validation at every resolve, walkthrough-pinned |
| CR10 | MED | Harvest undefined over retired/deleted ids | APPLIED — unknown-id pairs skipped (journal kept); orphaned accepted entries greyed in "My tuning" |
| CR11 | LOW | Newer-wins merge discards losing history | SUPERSEDED by C2's op-union redesign (unions ops by opId — both audit trails survive) |
| CR12 | LOW | Count-keyed dismiss re-surface breaks under `removeOutcome` | APPLIED — re-surface keyed on newest-failure date > dismissal date |
| CR13 | LOW | Positive lock-out crosses profile/context invisibly | PARTIAL (= Codex C5): kept pair-wide as deliberate safe-direction trade-off, now documented in §3.2; not nozzle-scoped (complexity > residual benefit at N=2 volumes) |
| CR14 | LOW | "Built this session"/"shipped on branch" forward-tense violations | APPLIED (= Codex C1): §4 retensed; §7 cell reworded |

## Outcome

Spec revised in place; 2 rounds (Codex cross-model + cold-read) converged on the same 4 load-bearing defects (TPU retraction, fan bounds, retraction site, merge losslessness) plus complementary uniques (lower-bound clamps, accept anti-ride ← cold-read; op-id merge, transitional rules-table commitment ← Codex). No finding rejected outright; 2 taken PARTIAL with recorded reasoning. Gate B1 exit: spec + these notes committed together.
