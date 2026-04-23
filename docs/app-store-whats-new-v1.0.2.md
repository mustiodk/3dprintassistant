# v1.0.2 — "What's New" (App Store Connect)

**Status:** FINAL — paste into ASC. Under 4000 chars.
**Last updated:** 2026-04-24 (post IR-4/IR-5 bundle, casual tone pass).

---

## Paste this into App Store Connect → What's New

```
Mostly a behind-the-scenes tune-up, but a few things you'll notice:

• Warnings now name your actual printer instead of guessing "A1/A1 Mini" for every bedslinger.
• New heads-up if your printer can't reach the recommended bed temp — it clamps safely and tells you why.
• Stale or broken saved profiles no longer leave you with an empty screen.
• If your slicer swaps an infill or surface pattern, you'll see what it actually used.
• Retraction length in Advanced Filament Settings now shows the real value the profile applies.
• Feedback from the app now goes through our own server before hitting Discord — better privacy.

Thanks for sending in bugs. Keep them coming.
```

Character count: ~530. Well under the 4000 cap.

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
