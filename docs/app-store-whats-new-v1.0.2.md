# v1.0.2 — "What's New" (App Store Connect)

**Status:** LOCKED DRAFT — paste into ASC after your tone pass. Under 4000 chars.
**Last updated:** 2026-04-23 (IR-2a session).

---

## Paste this into App Store Connect → What's New

```
Engine correctness + reliability pass — and a privacy improvement for how feedback reaches us.

Smarter warnings
• New safety check: if your printer can't reach the recommended bed temperature, the profile now clamps it and tells you why.
• Catches stale or corrupted saved profiles (from an old link or cached state) and recovers gracefully with a clear notice.
• Surfaces pattern substitutions: if your slicer doesn't support a specific infill or surface pattern, the app now shows what it's actually using.

Clearer rationale
• Why-text for speed and acceleration now names your actual printer (previously "A1/A1 Mini" showed up for every bedslinger — Prusa, Creality, etc.).

Reliability
• Engine init failures now report the real error instead of masking as a timeout.
• Safer numeric handling — the app no longer crashes on malformed preset data.

Privacy
• Feedback submissions now route through our own server before reaching Discord. Your messages are no longer sent directly from your phone to a third party.

Data
• Lightning infill recognized on PrusaSlicer.
• Adaptive Cubic recognized on Bambu Studio and OrcaSlicer.

Thanks for the feedback that drove this release.
```

Character count: ~1100. Well under the 4000 cap.

---

## Your tone pass checklist

- "Smarter warnings / Clearer rationale / Reliability / Privacy / Data" headers — swap out if they read too internal. Alternative: remove headers entirely and use plain bullets.
- "Thanks for the feedback that drove this release" — swap for your preferred close.
- "New safety check: …" — you might prefer "Your printer's bed temperature is now verified against its actual hardware limit."
- Everything else is factual; edit only for voice.

---

## Alternate options (kept for reference)

### Short — if you want minimal release notes

```
Quality pass. Sharper print recommendations, clearer warnings, better engine reliability.

• Profile rationale now names your actual printer instead of generic defaults.
• New safety guard for bed temperature when your printer can't reach the recommended target.
• Recovers gracefully from invalid or corrupted saved profiles.
• Surfaces pattern substitutions when your slicer uses a different pattern than requested.
• Engine init errors now surface the real cause instead of a generic timeout.
• Feedback submissions route through our server for better privacy.

No visual changes. Thanks for the feedback — keep it coming.
```

### Long — for Discord + web release notes only (not App Store)

See this session's log in `docs/sessions/` for the full commit-by-commit trail across IR-0, IR-2a Phase A (engine sweep), and IR-2a Phase B (iOS reliability + Worker routing).
