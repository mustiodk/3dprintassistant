GO

No blocking behavior issues remain in the R5 delta I reviewed from `9295e5b` to `119fa8a`.

What changed resolves the original findings:
- `docs/printer-provenance.json` is now tracked in-tree, so the custody exception no longer depends on an untracked file: [docs/printer-provenance.json](/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/docs/printer-provenance.json:1).
- Dry-run preflight now preserves existing `origin/main` state and checks ahead/behind against it without fetching, which avoids wiping ahead evidence during dry-run: [scripts/intake-run-preflight.sh](/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/scripts/intake-run-preflight.sh:104), [scripts/intake-run-preflight.sh](/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/scripts/intake-run-preflight.sh:118), [scripts/intake-run-preflight.test.sh](/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/scripts/intake-run-preflight.test.sh:55).
- `upsertPrinterProvenance` now clones both the document and provenance inputs before writing, and the tests assert non-mutation of both arguments plus idempotence: [scripts/intake-provenance-store.js](/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/scripts/intake-provenance-store.js:1), [scripts/intake-provenance-store.test.js](/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/scripts/intake-provenance-store.test.js:20), [scripts/intake-provenance-store.test.js](/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/scripts/intake-provenance-store.test.js:30).

The remaining requirements are met by the current logic:
- Dirty custody passes only for `scripts/printer-intake-outcomes.jsonl` and `docs/printer-provenance.json`: [scripts/intake-run-preflight.sh](/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/scripts/intake-run-preflight.sh:66).
- Ahead commits are allowed only when the subject matches `chore(intake): custody*` and every touched path is one of those custody paths: [scripts/intake-run-preflight.sh](/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/scripts/intake-run-preflight.sh:83).
- Behind still hard-fails before any ahead exception is considered: [scripts/intake-run-preflight.sh](/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/scripts/intake-run-preflight.sh:123).

Verification:
- `node --test scripts/intake-provenance-store.test.js` passed.
- I could not execute `scripts/intake-run-preflight.test.sh` in this sandbox because `mktemp` was blocked by the read-only environment, so the preflight portion is validated by static review plus the added test coverage rather than a local run.