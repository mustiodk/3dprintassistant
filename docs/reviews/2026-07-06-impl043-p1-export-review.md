# IMPL-043 P1 export refactor — cross-model review notes (gate A-review)

**Artifact:** `git diff main...learns-export-20260706 -- engine.js data/rules/objective_profiles.json scripts/validate-data.js scripts/export-audit.js`
**Review:** `bridge --mode codex-only` (health-checked; transcript `bridge-2026-07-06-184438-104295.md` in session scratchpad).

## Verified clean by the reviewer

- All six surface-condition rewrites (seam_position / only_one_wall_top / ironing_type data reads) behavior-match `main` for draft/standard/fine/very_fine/ultra/maximum.
- No sidecar corruption in `formatProfileAsText`, `exportProfile`, or web rendering (all read `.value`).
- No legacy special-case handler found without a corresponding sidecar (key-by-key vs BAMBU_PROCESS_MAP).
- No `_numericValue` mishandling found for numeric params.

## Findings

| # | Sev | Finding | Disposition |
|---|---|---|---|
| R1 | MUST | internal_solid `zig-zag`→`rectilinear` is a behavior change for every Bambu export, not just a validity fix — bless explicitly or preserve | **BLESSED + PINNED.** The change is deliberate (export now equals both the displayed value and the data canonical; the legacy zig-zag was a regex-era assertion that display-Rectilinear meant BS-zig-zag — two DIFFERENT BS patterns). Audit now hard-asserts `internal_solid == 'rectilinear'` so it can never silently flip either way, and the OWNER-VERIFY import test explicitly checks BS shows Rectilinear. Enumerated since commit `e880574`. |
| R2 | SHOULD | Audit checked capability-validity only, not the former special-case handlers key-by-key | APPLIED — generic sidecar drift guard: every BAMBU_PROCESS_MAP string param with a `_slicer_value` must export EXACTLY it (35 checks across 3 states incl. seam override, both support styles, mouse-ears brim) |
| R3 | SHOULD | support_style 5-map only logged as INFO | APPLIED — 4 hard assertions (tree_slim / tree_strong / tree_hybrid / default) |
| R4 | OPT | `slicerValueFor` validSet[0] silent default is fragile | ACCEPTED AS-IS — deliberately mirrors mapForSlicer's documented fail-open posture (OBS-007); the R2 sidecar guard now catches any wrong default the moment it would reach an export. Revisit if Phase 3 Orca work adds new enums. |

Post-fix audit: **0 FAIL / 1 warn** (the warn = dual-extruder-variant arrays, owner-import-test adjudicated by design).
