# 3dpa — Next Session Kickoff

**Purpose:** copy-paste kickoff prompt for the next fresh 3dpa session.
**Last updated:** 2026-07-12 (parallel account-platform candidates merged; owner comparison is the locked decision task).

The account work is planning-only. Nothing is deployed or live from either account proposal. Existing export and iOS release work remains valid and can continue independently, but no account/cloud implementation gate starts until the owner has compared and ratified one synthesized decision set.

---

Copy everything between the markers into a new session.

>>> START >>>

3dpa cold start.

Read in order:

1. `~/dev/Claude/Projects/CLAUDE.md`
2. `3dprintassistant/CLAUDE.md`
3. `3dprintassistant/docs/3dpa-context.md`
4. `3dprintassistant/docs/planning/ROADMAP.md`
5. `3dprintassistant/docs/sessions/INDEX.md`
6. Last three relevant session logs:
   - `3dprintassistant/docs/sessions/2026-07-12-cowork-appdev-independent-accounts-platform.md`
   - `3dprintassistant/docs/sessions/2026-07-12-cowork-appdev-accounts-platform.md`
   - `3dprintassistant/docs/sessions/2026-07-11-cowork-appdev-monetization-phase1.md`
7. This `NEXT-SESSION.md`.
8. Parallel account candidates and reviews:
   - Claude candidate:
     - `3dprintassistant/docs/superpowers/specs/2026-07-11-accounts-platform-design.md`
     - `3dprintassistant/docs/superpowers/plans/2026-07-11-accounts-platform-plan.md`
     - `3dprintassistant/docs/reviews/2026-07-11-accounts-platform-review.md`
   - Independent Codex candidate:
     - `3dprintassistant/docs/superpowers/specs/2026-07-12-codex-my3dpa-account-cloud-design.md`
     - `3dprintassistant/docs/superpowers/plans/2026-07-12-codex-my3dpa-account-cloud-plan.md`
     - `3dprintassistant/docs/reviews/2026-07-12-codex-my3dpa-spec-review.md`
     - `3dprintassistant/docs/reviews/2026-07-12-codex-my3dpa-plan-review.md`

Then verify local state:

```bash
cd ~/dev/Claude/Projects
~/.claude/claude-sync.sh verify-parents
~/.claude/claude-sync.sh push-children --dry
git -C 3dprintassistant fetch --all --prune
git -C 3dprintassistant status --short --branch
git -C 3dprintassistant-ios status --short --branch
```

Expected known warning: `3dprintassistant-ios` may remain ahead locally under the iOS push gate. Do not push it merely to clean health output.

Today's primary task: owner comparison and ratification of the two account-platform candidates.

1. Build one concise comparison table covering:
   - product/free-vs-Pro boundary;
   - identity, Worker, database, and regional topology;
   - PDM/portable data model and migration strategy;
   - Workshop sync and conflict semantics;
   - inventory event/projection/import model;
   - My 3DPA/profile hub UX;
   - export, deletion, backup, and DR guarantees;
   - web/iOS/Android/macOS sequencing;
   - gate/PR granularity, cost, and operational load.
2. For every difference, recommend `Claude`, `Codex`, or `synthesize`, with a one-sentence rationale and any owner decision needed.
3. Produce one owner-ratified decision/disposition document. Keep both source specs intact as evidence until ratification.
4. Only after owner ratification, update ROADMAP to name the canonical plan and park/retire the alternative. Do not begin G0/AP1/C0 or provision external resources in the comparison session unless the owner explicitly expands scope.
5. Preserve the existing release sequence: Export Phase 3 Orca → Phase 4 Prusa → reviewed iOS 1.0.7 issue-fix train; monetization iOS 1.0.8 remains separate after 1.0.7.

Standing rules:

- Progress bar on multi-step work.
- ROADMAP is truth; read it fully before status claims.
- Web is master for engine/data; mirror byte-identically when touched.
- One finding = one commit.
- Data/logic changes require web+iOS/Android/macOS UI/UX evaluation.
- iOS push gate remains active; no push before the complete TestFlight-ready train and owner GO.
- No account implementation or production provisioning before a single canonical owner-ratified plan exists.

>>> END <<<

Maintenance note: this file is regenerated on Trigger A / Trigger B / explicit owner ask only.
