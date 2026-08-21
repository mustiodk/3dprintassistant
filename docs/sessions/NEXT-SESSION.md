# Next session — 3D Print Assistant

This file is the cold-start entry point. It is regenerated on a `wrap up` / `handoff`
trigger or an explicit ask — not on every session end, so a stale copy between sessions is
expected and fine.

**Last updated:** 2026-08-21, after My Gear shipped to production.

## Where things stand, in one paragraph

My Gear is **live on 3dprintassistant.com** — verified against the live site, not inferred
from a push. That closes Train 1's web half. `3dpa_gear_v1` is frozen for real now: the
first production browser write has happened, so every future change to that envelope is a
compatibility problem rather than an edit. Pro's shape is settled (D19/D20): a one-time
purchase containing cloud sync, Inventory and AI Expert access, shipping with free starter
credits. Price and credit count are deliberately open.

>>> START >>>

Read these in order before doing anything:

1. `Projects/CLAUDE.md` — standing rules and the session-lifecycle triggers
2. `3dprintassistant/CLAUDE.md` — project rules
3. `3dprintassistant/docs/3dpa-context.md` — architecture, engine API, app state, slicer routing
4. `3dprintassistant/roadmap.md` — the live 2.0 roadmap (this is the current surface; it
   renders at https://3dprintassistant.com/roadmap)
5. `3dprintassistant/docs/planning/2-0-PROGRAM-PLAN.md` — what 2.0 is, readiness per feature,
   and the open decisions table
6. `3dprintassistant/docs/sessions/INDEX.md`
7. The last three session logs in `3dprintassistant/docs/sessions/`, in full
8. This file

**Today's task — pick one. They are independent.**

**A. Write the Pro spec.** Unblocked as of 2026-08-21. D19 settles the contents (cloud
sync + Inventory + AI Expert access, credits sold separately); D20 settles the shape
(one-time non-consumable purchase, ships with free starter credits). Still to define:
purchase flow, entitlement storage, what happens on refund, and how a web user who bought
on iOS is recognised. The price is a single named value you leave as a placeholder — the
owner sets it before go-live.

Two constraints the spec must carry, both already recorded:
- **D18a still governs the launch listing.** Inventory ships *after* 2.0, so the App Store
  description, paywall and purchase flow may sell Pro on cloud sync + AI Expert only.
  Naming Inventory before it exists is a 2.1(a) / 2.3.1(a) rejection risk.
- Credit packs are the app's **first consumables**, and App Store Connect blocks a
  standalone first-consumable submission. IAPs and the app version must travel as one
  submission; `Add for Review` is a dropdown, and joining the existing draft is what clears
  the block.

**B. Fix the iOS Workshop store.** `3dprintassistant-ios/3DPrintAssistant/.../WorkshopStore.swift`
has no `archived_at` field and rebuilds its whole file from typed objects on every write,
so any iOS write strips the deletion tombstones the web app started writing on 2026-08-21.
A profile deleted on web returns after an iOS backup round-trip. **Live today**, not only
under sync — and it gates sync. Note the iOS push gate: commit locally, do not push until
the owner is ready for TestFlight.

**C. Write the iOS storage contract**, before any iOS gear code exists. Every current iOS
store decodes to a typed DTO and rebuilds the file from it, dropping keys it does not know.
The gear format requires the opposite — §2.4 "unknown keys are preserved, never dropped" —
and `gear-store.js` closes this deliberately in `_mutate` and `touch`. Written down first,
or the house pattern gets copied and the rule is broken by default.

**Scope**
- Web is free to push; Cloudflare deploys `main` automatically. **iOS is push-gated.**
- `engine.js` and `data/` are out of scope for all three tasks. Verify with
  `git diff --stat -- engine.js data/` before finishing.

**Process**
- Multi-step work: show the progress bar every time.
- Resolve technical trade-offs yourself with a subagent plus a cross-model gate. Escalate
  only product, pricing, scope and risk appetite.
- Delegate self-contained work to subagents and stay in the directing seat; plan the
  remaining tracks ahead rather than deciding one task at a time.
- A review of a draft is not a review of the applied fixes. Re-review after fixing.
- Before trusting a green, confirm the environment can produce a red — the in-app browser
  pane cannot scroll and cannot run animations, and both produced false passes on
  2026-08-21.

<<< END <<<

## Open decisions

| | | Whose |
|---|---|---|
| **O2b** | What Pro costs. Deferred to before go-live; gates App Store product creation, not the spec. | Owner |
| **O6** | What one credit is worth. Needs issue #38's **D2** (privacy + business case → SKU table), which needs **D1** (provider eval on a fixed 3D-print eval set). Both scheduled in Train 2. | Mine to prepare, owner decides at D4 |
| **O4** | Three technical items deferred from the sync gate: tombstone location, whether archived rows belong in backups, a spec-wording fix. | Mine |

## Known, deliberately unfixed

- `_sameFieldSet` does not deduplicate before comparing, so a value array carrying a repeat
  skips the duplicate warning. Reachable only by hand-editing a share URL; costs one
  un-warned duplicate gear, not data loss.
- `buildPrinterPicker` adds a document-level click listener on every call and never removes
  it, leaking one per `buildFilters()`.

## Maintenance

Regenerated on `wrap up` / `handoff` / explicit ask. Not on ordinary session end.
