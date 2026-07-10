# Direct Codex review — Intake Autonomy v2.1 R4

**Date:** 2026-07-10  
**Reviewer path:** `codex exec --ignore-user-config -m gpt-5.4 -s read-only`  
**Session:** `019f4d91-e745-7b11-9fa7-6d886ca04223`

Claude review remained unavailable under the confirmed monthly spend limit, so R4 used the canonical direct read-only fallback.

## Initial verdict: NO-GO

1. **HIGH — objection identity bypass.** The gate matched resolutions by array index without preserving `reviewer` / `field` / `question` / `raisedAt`, and ignored extra regenerated objections. Reordered or extra-leading objections could request a review with evidence attached to the wrong question.
2. **MEDIUM — malformed `resolvedAt`.** Non-empty free text and impossible calendar dates passed the timestamp field.
3. **MEDIUM — missing regression coverage.** The suite did not pin reordered/extra objections or malformed timestamps.

The behavior findings landed separately, each with RED-first coverage:

- `0c8cf5e` — require exact objection count, identity, and order before evaluating `resolvedBy`.
- `12efd9f` — reuse the strict ISO-8601 calendar validator for `resolvedAt`.

## Focused re-review: GO

The same read-only session reran the 16-test suite and direct probes. It confirmed:

- reordered, extra, and missing objections fail with `review-no-go-unresolved` and `reviewRequests:0`;
- malformed and impossible `resolvedAt` timestamps fail with zero review turns;
- a valid one-objection or multi-objection retry returns exactly `reviewRequests:1`;
- each resolution remains bound to the persisted objection identity.

Final reviewer verdict: **GO**.

