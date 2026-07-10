# Direct Codex review — Intake Autonomy v2.1 R3

**Date:** 2026-07-10  
**Reviewer path:** `codex exec --ignore-user-config -m gpt-5.4 -s read-only`  
**Session:** `019f4d8a-1618-7850-90f1-55ea3d3b7dad`

Claude review was unavailable under the already-confirmed monthly spend limit, so R3 used the canonical direct read-only fallback.

## Initial verdict: NO-GO

1. **HIGH — persisted taint laundering.** `writeParked()` derived taint only from the incoming object. A caller could strip `tainted` and `verdictRefs` from an already-tainted parked file and write it into `research-defect`.
2. **HIGH — repair counter bypass.** Negative, fractional, or non-numeric `repairAttempts` could obtain another research repair instead of failing closed.

The findings landed separately:

- `868c950` — preserve prior NO-GO verdict references and taint across writes; refuse a stripped payload entering a non-tainted class.
- `1d96535` — accept only non-negative integer counters; malformed counters route to `decision-required` with owner trigger in both migration and repair entry.

## Focused re-review: GO

The same read-only session inspected both fixes and ran focused probes covering:

- real-like K2 SE v1 migration → `decision-required`, tainted, `repairAttempts:0`;
- normal repair `0 → 1`, then `1 → decision-required`;
- `"banana"`, `-1`, and `1.5` → `decision-required`, never a repair pass;
- migration of malformed repair counters → `decision-required`;
- persisted NO-GO history retained by the write path.

Final reviewer verdict: **GO**.

