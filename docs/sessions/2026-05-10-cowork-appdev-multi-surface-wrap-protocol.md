# 2026-05-10 - Cowork (appdev): multi-surface wrap protocol + vault collaboration guide

## Durable context

- The session started as 3DPA release/TestFlight follow-through, then became a protocol-quality repair after the ROADMAP update was missed during an earlier wrap-up.
- `docs/planning/ROADMAP.md` is current for 3DPA live product state: latest TestFlight candidate is version `1.0.3`, build `202605101130`, run `25627557344`; earlier build `202605090842` review was cancelled.
- A new vault collaboration area now exists at `Obsidian Vault/20-Areas/Development/ai-collaboration/` with copy-paste triggers and working guidelines for protocol literalism, visible progress, quality pushback, and multi-surface wrap-ups.
- Multi-surface closes must identify every touched project/surface from actual git status, run the relevant close path for each in sequence, and produce one combined handoff prompt so Claude/Codex does not resume from only the project where the session started.
- The vault has unrelated owner-added Bambu raw-source changes still dirty; do not mix them with protocol/wrap-up commits unless explicitly asked.

## What happened / Actions

1. Owner asked what the wrap-up protocol says about ROADMAP.
2. Re-read `Projects/CLAUDE.md` and confirmed Trigger A step 7 requires updating tracking docs, with ROADMAP as 3DPA live planning truth.
3. Repaired ROADMAP after the profile-audit/TestFlight session so it points at build `202605101130` instead of the older remote-catalog build.
4. Created the vault AI collaboration area with:
   - `working-guidelines.md`
   - `trigger-cheatsheet.md`
   - local `README.md`
5. Linked the new area from vault overview files: vault `README.md`, vault `CLAUDE.md`, `20-Areas/README.md`, `20-Areas/Development/README.md`, and `toolchain.md`.
6. Audited vault `CLAUDE.md` and corrected stale sync guidance: content curation is deliberate, git autosync only transports file changes.
7. Owner asked how multi-project wrap-ups should work; added durable multi-surface wrap-up guidance and a copy-paste trigger to the vault collaboration guide.
8. Ran this full wrap-up by reading the canonical protocol first, showing the checklist, checking ROADMAP, performing md/vault hygiene checks, and regenerating `NEXT-SESSION.md` with the full Trigger C read order.

## Files touched

**3DPA repo:**
- `docs/planning/ROADMAP.md`
- `docs/sessions/2026-05-10-cowork-appdev-multi-surface-wrap-protocol.md`
- `docs/sessions/INDEX.md`
- `docs/sessions/NEXT-SESSION.md`

**Obsidian vault:**
- `README.md`
- `CLAUDE.md`
- `20-Areas/README.md`
- `20-Areas/Development/README.md`
- `20-Areas/Development/toolchain.md`
- `20-Areas/Development/ai-collaboration/README.md`
- `20-Areas/Development/ai-collaboration/working-guidelines.md`
- `20-Areas/Development/ai-collaboration/trigger-cheatsheet.md`

## Commits

**3DPA `3dprintassistant` main:**
- `c934a04` - `docs: refresh roadmap after profile audit wrap`

**Vault `obsidian-vault` main:**
- `ea01532` - `docs: add ai collaboration trigger guide`
- `6e533e2` - `docs: refresh vault schema sync guidance`
- `989154f` - `docs: add multi-surface wrap trigger`

## Open questions / Follow-up

- **Vault raw-source dirty tree:** owner-added Bambu source changes remain uncommitted/unreviewed in `Obsidian Vault/50-Wiki/raw/3dpa/bambu/` plus a deletion of `2026-04-29-tpu-printing-guide.md`. Treat as separate source-ingest/data-review work.
- **Vault filename hygiene:** several raw Web Clipper files have spaces/title-case names. This is existing/source-ingest hygiene; do not rename during unrelated protocol wrap-up.
- **NEXT-SESSION correction:** the previous `NEXT-SESSION.md` omitted ROADMAP from the explicit read order; this wrap regenerates it to match Trigger C.
- **No ROADMAP product change after repair:** ROADMAP was checked during this wrap; no additional live product status change was needed after commit `c934a04`.

## Next session

Recommended first lane remains **TestFlight phone verification for build `202605101130`**.

If the next session is about process/protocol instead, start from the vault AI collaboration pages and use the multi-surface wrap-up trigger when the work crosses project/vault boundaries.
