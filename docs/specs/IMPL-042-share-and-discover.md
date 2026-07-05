# IMPL-042: Share & Discover (URL profile state, saved session, printer x material landing pages)

**Status:** PROPOSED (Phase 1 review deliverable, 2026-07-05, Fable 5 autonomous review)
**Owner decision required before any implementation.**
**Companion review:** `docs/reviews/2026-07-05-fable5-phase1-review.md` (deliverable 7 context, opportunity map rationale)

---

## 1. Goal

Make the profiles 3DPA already generates shareable, resumable, and discoverable, without touching the engine, the data files, or the privacy stance.

Three user-visible outcomes:

1. **Resume:** a returning visitor finds the app exactly where they left it (printer, material, nozzle, goals restored).
2. **Share:** any configured profile has a copyable URL that reproduces it exactly for someone else (forum answers, Discord replies, "here, use this" moments).
3. **Discover:** search engines can finally see the product. Today the site is a single SPA plus privacy/support pages; `sitemap.xml` lists 3 URLs. A static, build-time-generated landing page per curated printer x material combination gives Google real content to index and gives every page a one-click path into the live configurator via the share-URL mechanism from outcome 2.

Why this is the number-one pick (summary; full argument in the companion review): it is the highest-leverage move that is web-only, engine-untouched, privacy-clean, solo-sized, and it multiplies the value of everything already built. More visitors feed the feedback form, which feeds the already-automated printer-intake pipeline. It also creates the natural surface (landing pages) for any future monetization experiment (disclosed affiliate links), without committing to one now.

## 2. Non-goals

- No engine.js changes. The state codec lives in app.js; the page generator reads the engine read-only the same way `scripts/walkthrough-harness.js:1` does (Node `vm` with polyfills).
- No data/*.json changes.
- No accounts, no server-side state, no URL shortener backend. The URL carries the state; nothing is stored anywhere.
- No new analytics events in this spec. (A later, separate decision may add a `landing_page` dimension; it is not needed to ship.)
- No affiliate links in this spec. Landing pages must ship clean; monetization is a separate owner decision (review section 5).
- No iOS binary requirement to ship Phases A-C. iOS parity items are scheduled, not blocking (section 6).
- No resin, no new printers/materials, no Tuned-layer data work.

## 3. Design

### Phase A: session persistence (web)

On every state mutation, serialize the app-state object (the canonical shape in `docs/3dpa-context.md:84-94`) to `localStorage` key `3dpa_state_v1`, wrapped in try-catch per the standing rule (`CLAUDE.md` critical rule 4). On load, restore if present and valid; ignore silently if not.

- Validation on restore: every id is checked against the loaded catalogs (`Engine.getPrinter(id)` etc.). Unknown ids (e.g. a retired printer) drop to the field default; never crash, never half-restore into an inconsistent state. Restore runs after `Engine.init()` resolves.
- A visible "Reset" affordance already exists conceptually (web has implicit reset by reselecting); add an explicit "Start over" link near the printer summary so restored state never feels sticky.
- `3dpa_notrack` and theme/lang keys are untouched (`app.js:8`, `app.js:169-188`).

### Phase B: shareable profile URLs (web)

Encode state in query params on the canonical origin: `https://3dprintassistant.com/?p=<printer>&m=<material>&n=<nozzle>&sq=<surface>&st=<strength>&sp=<speed>&e=<env>&su=<support>&c=<colors>&u=<level>&pm=<profileMode>&uc=<useCase,csv>`.

- Short stable keys, values are the existing data ids verbatim. Ids are already URL-safe (lowercase snake_case).
- On load: URL params take precedence over localStorage. Invalid ids degrade per Phase A rules.
- On state change: update the URL via `history.replaceState` (no history spam). This makes every configured view bookmarkable by default.
- A "Share" button next to the existing Compare button (`index.html:126`) copies the current URL with a toast, mirroring the existing copy pattern (`app.js:848`).
- Only selection ids ever appear in the URL. No free text, no numbers, no PII. Privacy check: sharing is user-initiated; the URL reveals nothing beyond what the user chose to share.

### Phase C: static landing pages (web, build-time)

A new generator `scripts/generate-landing-pages.js`:

- Loads `engine.js` in Node exactly like `scripts/walkthrough-harness.js` does (vm + fetch/localStorage polyfills), calls `Engine.resolveProfile`, `Engine.getWarnings`, `Engine.getChecklist`, `Engine.getAdjustedTemps` for each curated combo at default goals (standard surface/strength, balanced speed, room temp, safe mode).
- Emits static HTML to `settings/<printer-id>/<material-id>/index.html` from a single template: title ("Bambu Lab A1 PLA settings: layer height, temps, speeds"), a rendered table of the simple-mode parameters with the "why" strings, top warnings, the checklist, a provenance note, a clearly dated "generated from 3DPA engine vX / data as of <date>" line, and one primary CTA linking into the configurator with the Phase B URL params.
- Curated scope, not the full cross product: launch set = every printer x {pla_basic, petg_basic, and the printer-appropriate third pick (abs for enclosed, tpu_95a for direct-drive open)}. Roughly 74 x 3 = ~220 pages. The full matrix (74 x 19 = 1,406) is a later flip once the template and indexing behavior are proven.
- Regenerates `sitemap.xml` (today 3 URLs) to include all landing pages with lastmod dates.
- Canonical tags on every page; the SPA keeps `rel=canonical` to itself so shared URLs with params do not create duplicate-content noise.
- Pages are plain static assets served by the existing Cloudflare Workers + Assets setup (`wrangler.toml` `[assets] directory = "."`); no routing changes needed. Verify `.assetsignore` does not exclude the new directory.
- English-only at launch (matches the reality that warning/checklist copy is English-only; see review section 2.6).

**Freshness rule (this is the one real maintenance cost):** regeneration must be part of the printer-addition flow. Add one step to `docs/runbooks/printer-addition-protocol.md` Phase 4 ("run `node scripts/generate-landing-pages.js` and commit the diff") and the same line to the profile-data-change runbook. Stale pages are worse than no pages: the page shows engine output, so an engine/data change that alters numbers must regenerate. The generator should be deterministic (stable ordering, no timestamps beyond the dated line) so diffs are reviewable.

### Explicitly rejected alternatives

- **Server-side short links** (`/s/abc123`): needs KV storage, adds an operational surface and a privacy question (stored profiles), for marginal URL aesthetics. Rejected.
- **Hash-based state** (`#p=...`): fragments are not sent to servers, which is fine, but they are also ignored by crawlers and stripped by some chat apps' unfurlers. Query params are the boring, correct choice.
- **Client-side rendering of landing pages** (SPA routes): invisible to crawlers without SSR; the whole point is static HTML. Rejected.

## 4. Engine / data changes

None. This is the load-bearing property of the spec. The generator consumes the public engine API read-only. If any phase turns out to need an engine change, stop and re-scope; that would change the test gate class.

## 5. UI changes: web

- `app.js`: state codec module (encode/decode/validate, ~100 LoC), restore-on-init hook, `replaceState` on mutation, Share button handler. Respects the engine/UI separation rule: the codec manipulates the app-state object only; it never reaches into engine internals.
- `index.html`: Share button in `panel-header-actions` (`index.html:125-133`), "Start over" link.
- `style.css`: styling for the two new controls, both themes.
- `locales/en.json` + `locales/da.json`: ~4 new keys (share, shared-link-copied, start-over, restored-notice). Danish translations included (and while in those files, fix the 2 missing Danish keys `secNozzleTemp_prusaslicer` / `secBedTemp_prusaslicer`; one-line hygiene ride-along, separate commit).
- New template + generated `settings/` tree (Phase C).

## 6. UI changes: iOS (mandatory data/logic-change evaluation)

The mandatory evaluation per the standing rule (`docs/3dpa-context.md:181`, rule 4):

- **Engine/data delta: none**, so no iOS engine sync, no walkthrough-vs-XCTest parity work, no overlay work.
- **Phase A parity (recommended, next release train):** iOS currently loses all configuration on restart (`AppState` is `@Observable` only; no persistence found in `Models/AppState.swift`). Mirror Phase A by persisting the state struct as JSON in Application Support and restoring on launch with the same unknown-id degradation rules. Small, isolated, no engine impact. Schedule with the next iOS version (v1.0.6 candidate), not as a TestFlight-triggering standalone.
- **Phase B on iOS (optional, later):** universal links (`applinks:3dprintassistant.com`) so a shared URL opens the app pre-configured on devices that have it. Requires an entitlement, an `apple-app-site-association` file served from the domain, and a URL-param decoder on the iOS side mirroring the web codec. Real value, real work; explicitly deferred until Phase B proves itself on web.
- **Phase C on iOS: none.** Landing pages are a web acquisition surface. The existing App Store link in the web header covers the bridge.

## 7. Test plan / gate

Per `docs/runbooks/profile-data-change-test-protocol.md`: this change touches neither engine nor data, so the heavy gate does not apply; run the default hygiene set anyway because it is cheap.

- `node scripts/validate-data.js` (must stay green, proves no accidental data edits)
- `node scripts/walkthrough-harness.js` (must stay green, proves engine untouched)
- New: codec unit tests in `scripts/` style (Node, no framework, matching `picker-dry-run.test.js` conventions): encode/decode round-trip for representative states, unknown-id degradation, empty/garbage URL handling, csv useCase handling, localStorage-corrupt handling. TDD: write the round-trip test RED first (codec absent), then implement.
- New: generator test: run generator, assert page count matches curated-combo count, assert one known page contains a known resolved value (pull the expected value live from the engine in the test, never hardcode, per the IMPL-040 single-source lesson), assert sitemap entry count.
- UI smoke (visible change, so per the runbook a tiny smoke is due): load with params, confirm restored chips; share button copies; start-over resets; light and dark themes.
- Post-deploy: `curl` two landing pages on the live domain and one param URL, confirm 200 and content (the "published is not delivered" lesson from the overlay incidents, `docs/sessions/2026-06-14-cowork-appdev-ios-overlay-aries-collision-fix.md`).

## 8. Rollout

1. Phase A + B ship together (they share the codec), one commit each per the one-finding-one-commit rule: codec+tests, persistence hook, URL+Share UI.
2. Phase C ships behind its own commits: generator+tests, template, generated pages + sitemap, runbook edits. Launch curated set (~220 pages), submit sitemap in Search Console, watch indexing for 2-4 weeks before considering the full matrix.
3. iOS Phase A parity rides the next planned iOS release. iOS push gate untouched.
4. Rollback: every phase is additive static content or app.js-local logic; `git revert` + auto-deploy restores prior state. No migrations, no stored state to clean up (localStorage key is versioned `_v1`; a revert simply ignores it).

## 9. Risks

- **SEO outcome is uncertain.** Static pages are necessary but not sufficient; ranking takes months and is not guaranteed. Mitigation: the same pages double as shareable reference answers for Discord/Reddit replies regardless of Google, and Phases A+B stand on their own merit.
- **Stale generated pages after data changes.** Mitigated by the runbook regeneration step and deterministic output; residual risk if a manual data edit skips the runbook. The dated "generated from data as of" line keeps staleness honest.
- **Thin-content penalty if the full 1,406-page matrix ships too early.** Mitigated by the curated launch set and per-page unique content (the "why" strings differ per combo because the engine computes them).
- **URL params drift from the state shape** when a future field is added. Mitigation: codec has a single field-map table; adding a state field without a codec entry is caught by the round-trip test failing on the new field only if the map is updated, so add a comment in the state-shape doc (`docs/3dpa-context.md:84`) pointing at the codec.

## 10. Standing-rules check

- engine/app separation: respected (codec and generator never modify the engine; generator consumes public API).
- Web is master / iOS mirrors: no engine/data delta, so nothing to mirror; iOS parity item scheduled explicitly (section 6).
- Data/logic-change evaluation: section 6, complete.
- One finding = one commit: rollout sequenced accordingly (section 8).
- iOS push gate: untouched; no iOS push required by this spec.
- Privacy-first: no PII, no tracking, no stored server-side state; share is user-initiated; landing pages are static. No conflict.
- Quality over speed: full validation + tests + post-deploy verification specified; no narrowed scope (the curated landing set is a deliberate SEO tactic, not a corner cut).
