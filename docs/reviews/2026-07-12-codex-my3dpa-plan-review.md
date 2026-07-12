# Independent My 3DPA implementation-plan review

**Date:** 2026-07-12  
**Plan:** `docs/superpowers/plans/2026-07-12-codex-my3dpa-account-cloud-plan.md`  
**Spec:** `docs/superpowers/specs/2026-07-12-codex-my3dpa-account-cloud-design.md`  
**Final reviewed plan commit:** `0ed8b64bde27f60168c775f53b46bd0f4493d527`  
**Final plan SHA-256:** `1e57bd885627933027ca1481906255fa70acdf53812d0c3f328e5e72650f101e`  
**Final spec SHA-256:** `bbe25ca4e040530829c65cdc99b0d2af2cc786adf87d6e5eb9985ebd08d25a8a`

## Protocol

The plan received independent architecture and QA reviews plus an isolated Claude cross-model review. Each round was patched and rerun. The reviewers were explicitly prohibited from inspecting the quarantined 2026-07-11 same-task Claude artifacts.

## Material findings closed

- split production provisioning, owner account canary, owner sync canary, and public 5/25/100 rollout;
- added remote Cloudflare and Firebase staging provisioning/rollback before auth;
- split broad programs into atomic one-PR gates with exact commands, scopes, flags, evidence, and rollback;
- made B0 the sole owner of the complete current-spec schema and removed duplicate later migration ownership;
- separated Firebase `sub` from the server-issued `app_account_token` and excluded the latter from portable export;
- made account deletion impossible until the external erasure pre-write, reconciler, and DR blocker are active;
- added IC0 pre-merge Swift parity, signed-out backup cleanup, graveyard-key, system-actor, export purge, and capability-negative evidence;
- added repeatable iOS release gates, production-backed TestFlight soaks, and the iOS no-push boundary;
- ordered inventory, entitlement backend, StoreKit client, production canary, and release gates without circular dependencies;
- corrected portable inventory entities and made bambuinventory reuse a read-only local exporter.

## Final verdicts

- Architecture subagent: `ZERO P0-P2` on exact final candidate.
- QA subagent: `ZERO P0-P2` on exact final candidate.
- Claude cross-model: `VERDICT: ZERO P0-P2` on the isolated final packet.

The durable cross-model transcript is in `2026-07-12-codex-my3dpa-plan-final-cross-model.md`.
