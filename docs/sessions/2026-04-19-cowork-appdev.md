# Session: 2026-04-19 — Cowork App Dev

**Type:** Web bug fixes (post-release). Mac app kickoff deferred.
**Focus:** Production-visible warning bug + layer-height compatibility issue on Bambu Studio import.
**Context:** Session started as macOS app kickoff (#037) but pivoted when user reported a web-app bug.

---

## What happened

### 1. Warnings rendered as "undefined" on production
- **Report:** User saw three warning cards below the configurator showing literal `undefined` text.
- **Root cause:** RB-1 (2026-04-08) converted `Engine.getWarnings()` to return structured objects `{ id, text, detail, fix }` in the iOS + web codebase, and `renderWarnings()` in `app.js` was updated to read `m.text` / `m.detail`. **But the engine-side conversion was only saved locally, never committed.** Production kept serving the old HTML-string format — so `m.text` and `m.detail` resolved to `undefined` on every warning object.
- Confirmed the mismatch by curling live `engine.js` (still had `warnings.push('<strong>...</strong>...')`) and comparing to the dirty working tree (full structured-object conversion already done, ~114 lines).
- **Fix:** Committed the existing uncommitted `engine.js` diff — all 33 `warnings.push(...)` sites routed through the `w(id, text, detail, fix)` helper. No other files changed.
- **Verified:** Preview reproduced structured warnings rendering correctly; post-deploy curl confirmed zero remaining old-shape pushes on production.
- **Commit:** `82e10ac` — "Fix undefined warnings on web: return structured objects from getWarnings()"

### 2. Layer-height conflict on Bambu Studio import — DIAGNOSED (not yet fixed)
- **Report:** Configurator suggests `0.30mm` layer height for Draft surface quality. When user applies it in Bambu Studio for X1C with the 0.4mm nozzle, Studio pops: "Layer height exceeds the limit in Printer Settings → Extruder → Layer height limits."
- **Root cause:** Bambu's printer-level `max_layer_height` for a 0.4mm nozzle is **0.28mm** (confirmed by inspecting `bambu configs/Bambu Lab A1 0.4 nozzle - Skaal pistacie.json` — `"max_layer_height": ["0.28"]`, `"min_layer_height": ["0.08"]`). Our engine's C3 warning uses 75% of nozzle diameter (0.30mm for 0.4mm nozzle), which is less strict than Bambu's actual 70% ceiling.
- **Circumstantial evidence inside our own code:** the `BAMBU_PROCESS_INHERITS` map at `engine.js:1693` already maps `'0.30' → '0.28mm Extra Draft @BBL X1C'` — we fall back to the 0.28 preset because Bambu doesn't ship a 0.30 preset for 0.4mm. So the profile inheritance layer already knows 0.30 isn't real, but the user-facing `layer_height` value we emit stays 0.30.
- **Planned fix (next iteration):** change Draft `layer_height` in `data/rules/objective_profiles.json` from `0.30` → `0.28`, update its desc, and tighten the C3 warning threshold from `nozzle.size * 0.75` → `nozzle.size * 0.70` to match Bambu's actual ceiling. Also update the troubleshooter fix text at `data/rules/troubleshooter.json:142` which currently says "0.4mm nozzle → max 0.30mm layers."

---

## Decisions

- **Scope discipline:** the fix commit touched only `engine.js`. Left `BACKLOG.md` (310-line deletion) and `IMPL-036-profile-params.md` (391-line deletion) uncommitted — unrelated pre-existing WIP pruning, not part of this bugfix.
- **macOS kickoff (#037) deferred** — user wants to clear the web bug surface first. Kickoff prompt at `docs/prompts/macos-app-kickoff.md` remains valid for next session.

---

## Files modified

### Web — committed
| Commit | What |
|---|---|
| `82e10ac` | Fix undefined warnings: `engine.js` `getWarnings()` now uses structured-object shape everywhere. Matches `app.js` `renderWarnings()` contract that reads `m.text`/`m.detail`. |

### Web — still dirty in working tree (pre-existing)
- `BACKLOG.md` — mass prune, unrelated to this session's bug
- `IMPL-036-profile-params.md` — mass prune, unrelated

---

## Next session should

1. **Ship the layer-height fix** described above (Draft 0.30 → 0.28, C3 threshold 0.75 → 0.70, troubleshooter text update). Small data-only change, minutes to commit + push + verify.
2. **Evaluate whether iOS needs the same data sync** — iOS reads `objective_profiles.json` via bundled resource. If Draft drops to 0.28, iOS must pick that up in its next release. Check `3dprintassistant-ios/PrintAssistant/Resources/data/rules/objective_profiles.json` and sync.
3. **Resume macOS app kickoff** if web surface is clean.
4. **Check EU Trader Status** — still open from 2026-04-16. If verified, unlock the held launch announcement.

---

## Commits this session

### Web
1. `82e10ac` — Fix undefined warnings on web

### iOS
None.

---

🐛 **Discovery:** RB-1 was marked complete in the ROADMAP but the engine-side half was never committed to `main`. The gap was invisible because iOS got the structured objects directly (iOS engine.js was copied from local dev, which had the fix), and the web renderer looked correct in isolation. Only a production-site visit would have caught it. Consider this a reminder to verify "Done" items against `git log` on the affected branch, not against the working tree.
