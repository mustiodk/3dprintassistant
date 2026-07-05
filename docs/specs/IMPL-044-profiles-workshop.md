# IMPL-044: The Workshop (profiles, custom filaments, and a configurator that learns)

**Status:** PROPOSED (Phase 1 review V2 deliverable, 2026-07-05, Fable 5 autonomous review)
**Owner decision required before any implementation.**
**Companion docs:** `docs/reviews/2026-07-05-fable5-phase1-review.md` (V2 addendum), `docs/specs/IMPL-042-share-and-discover.md` (Phase A is this spec's substrate), `docs/specs/IMPL-043-slicer-export-activation.md` (export plumbing this spec reuses).

---

## 1. Goal

Give 3DPA a personal layer: a "Workshop" section where a user saves profiles that worked, adds their own filaments, and teaches the configurator their machine, all without accounts, servers, or tracking. Today the app is a brilliant calculator with amnesia; every visit starts from zero, every lesson the user learns stays in their head. The Workshop turns one-shot answers into a relationship, and it does it local-first so the privacy stance survives intact.

Dream-big framing, honestly phased: the end state is a configurator that adapts to your printer the way the Tuned tier was always meant to, seeded by your own print outcomes, with an opt-in community loop feeding the global data layer through the moderation pipeline that already exists for printer intake. The phases below each stand alone; nothing past Phase W1 is required for the earlier phases to pay off.

## 2. Non-goals

- No accounts, no server-side storage, no cross-device sync backend. Local-first forever; portability comes from file export/import and, later, platform sync (iCloud) that never touches our infrastructure.
- No automatic telemetry of outcomes. All learning data stays on device unless the user explicitly submits a contribution (Phase W4, opt-in per submission).
- No free-form parameter editor. The Workshop tunes via the same structured surfaces the app already has (goals, environment, advanced overrides); it is not a slicer.
- No change to the Safe tier's meaning. Safe stays conservative vendor-grounded truth; personal learning lands in a separate, clearly-labeled tier.

## 3. Design

### Phase W1: saved profiles (the shelf)

A "My profiles" panel: save the current configuration under a name ("Voron PLA brackets"), restore it in one tap, delete, rename.

- Storage: `localStorage` key `3dpa_workshop_v1`, versioned envelope, try-catch per the standing rule. Each entry stores the state object (IMPL-042's codec is the serializer, one codec for URL, persistence, and profiles), a name, created/updated dates, and free-text notes.
- Restore runs through the same validation as IMPL-042 Phase A (unknown ids degrade gracefully).
- Share button on a saved profile emits the IMPL-042 share URL; export buttons run the IMPL-043 exporters. The Workshop is where the other two specs compound.
- Backup: "Export my Workshop" downloads one JSON file; "Import" restores it. This is the no-account answer to device loss and the web-to-iOS bridge until platform sync.
- Engine/data changes: **none.** Pure app-layer, same load-bearing property as IMPL-042.

### Phase W2: outcome logging (the print journal)

Each saved profile gains an outcome record: printed it, and it worked / failed how (stringing, warping, adhesion, the troubleshooter's symptom vocabulary reused as tags), with an optional note.

- Value even with zero intelligence: "what did I run last time that worked" is the single most common thing hobbyists lose track of, and no slicer answers it.
- The failure tags deliberately reuse `data/rules/troubleshooter.json` symptom ids, so a failed outcome can deep-link into the troubleshooter with the symptom preselected, and so later phases can reason over structured tags instead of prose.
- Engine/data changes: none. The journal is app-state.

### Phase W3: personal tuning (the configurator learns you)

The learning step, kept honest and mechanical, no ML pretense:

- When outcomes accumulate for a printer + material pair, the Workshop computes bounded personal offsets (temperature plus or minus, cooling, retraction class tweaks) from the troubleshooter's own remedy rules: N stringing failures at default temp suggest the temp offset the troubleshooter already recommends; the user accepts or dismisses the suggestion explicitly. Suggestions are never silently applied.
- Accepted offsets become a third profile tier: **Safe / Tuned / Mine.** Implementation reuses the `_tier()` override mechanism (`engine.js:77`): the engine accepts an injected personal-overrides object at resolve time, structurally identical to the `_tuned` blocks in `data/rules/objective_profiles.json`. This is the first engine change in the spec, and it is small because the override machinery already exists; the personal layer is sparse overrides with provenance `personal`, rendered with the existing `_prov` sidecar UI so users see exactly which values are theirs.
- The nearly-empty Tuned tier stops being an embarrassment: even before DQ-3/4/5 fill the global data, every user can fill their own.

### Phase W4: custom filaments

"Add a filament": pick the closest existing material as a template, name it (brand, color), and override the structured fields the user actually knows from the spool box (nozzle temp range, bed temp, dry-before-use). Stored in the Workshop, injected at engine init as a user-materials overlay (engine API addition: a registration hook that merges validated user materials after `data/materials.json` loads, ids namespaced `user_*` so they can never collide with or shadow canonical ids).

- This is ROADMAP backlog #020 (filament database) approached from the private side first: instead of us curating hundreds of brand profiles, users encode their own spools, which is the data they trust most anyway.
- Custom filaments flow through everything: profiles resolve against them, warnings fire on their values, IMPL-043 exports them, IMPL-042 share URLs must exclude or inline them (design decision: inline as payload, since the recipient lacks the sender's Workshop; resolve during W4 design).
- Validation: user values clamp through the same printer-capability clamping as canonical materials (IMPL-039); a custom filament cannot silence safety warnings.

### Phase W5 (horizon): the community loop

Opt-in, per-submission: "share this tuned profile with 3DPA" packages the printer + material + accepted offsets + outcome tags (no notes, no identifiers) into a submission reviewed through the same human-gated pipeline that already moderates printer intake (Scout / Assistant / guardrails, `scripts/printer-intake-scout.js` family). Accepted patterns become global `_tuned` candidates with provenance `community`.

- This is the dream-big payoff: the Tuned tier fills itself from real print outcomes instead of hand-curation, using moderation infrastructure that already exists and a provenance system that already distinguishes sources.
- It is deliberately last: it only makes sense once W2/W3 generate enough personal data, and it is the only phase with a real privacy surface, so it gets its own spec and owner decision when its time comes. Nothing before it depends on it.

## 4. Engine / data changes

- Phases W1, W2: none.
- Phase W3: engine accepts a personal-overrides injection through the existing `_tier()` path; provenance value `personal` added. Small, additive, no behavior change when no overrides are present.
- Phase W4: user-materials registration hook with `user_*` namespace and full validation/clamping. Additive; canonical data untouched.
- Phase W5: no engine change (data arrives through the normal `_tuned` data path after moderation).

Each engine-touching phase triggers the full profile-data-change gate and byte-identical iOS sync per the standing rules.

## 5. UI changes: web

- New "Workshop" view alongside Configurator / Troubleshooter (nav pattern already exists, `app.js:83` view switching): profile shelf, journal entries, custom filament list.
- Save button in the results header (next to Compare and the IMPL-042 Share button).
- Mine tier appears in the existing Safe/Tuned toggle only when personal offsets exist.
- Custom filaments appear in the material picker under a "My filaments" group header.
- Locale keys for all new copy, English and Danish both (and the Workshop is a natural forcing function for the warning-translation debt noted in the review, since journal tags surface warning vocabulary).

## 6. UI changes: iOS (mandatory evaluation)

- W1/W2 are app-layer: iOS builds its own SwiftUI Workshop surface over the same engine, storing in Application Support, sharing the JSON backup format with web (that file is the cross-device story). Scheduled as its own release train.
- W3/W4 engine changes sync byte-identical; iOS UI adopts the Mine tier and custom-filament picker in the same train as its Workshop surface.
- Universal links (IMPL-042 deferral) become more valuable here: a shared profile URL opening in the app with the Workshop present is the full loop. Still deferred, still optional.

## 7. Test plan / gate

- W1/W2: Node codec/storage tests in the `picker-dry-run.test.js` style (round-trip, corrupt storage, quota-exceeded, version migration from `_v1`); UI smoke both themes; validate-data and walkthrough stay green proving engine untouched.
- W3: walkthrough assertions that injected personal overrides win over Tuned, lose to clamps, and disappear cleanly; RED-first per the TDD convention; XCTest mirrors on the iOS train.
- W4: validate-data-class checks on user material input ranges; walkthrough assertions that a `user_*` material resolves, clamps, and warns like a canonical one and can never shadow a canonical id.
- W5: gets its own spec and gate when scoped.

## 8. Rollout

W1 alone is a complete, shippable feature and the cheapest (it is mostly IMPL-042's codec plus a list UI). W2 rides shortly after. W3 and W4 are each their own arc with engine work and iOS trains. W5 is a horizon decision. Recommended interleaving with the other specs is the V2 addendum's Now/Next/Later, not repeated here.

## 9. Risks

- **localStorage fragility** (cleared by the browser, invisible across browsers): mitigated by the backup file, honest copy ("stored on this device"), and eventually iOS/iCloud on the app side. Accepted as the cost of no-account.
- **Mine-tier overconfidence:** a user's bad offsets are their own, but they must never override safety clamps; W3's clamp-precedence tests are the guard.
- **Scope gravity toward a slicer:** the structured-fields-only rule (section 2) is the fence; revisit deliberately or not at all.
- **W5 privacy surface:** contained by making it a separate future spec with per-submission opt-in and the existing moderation pipeline; nothing earlier depends on it.

## 10. Standing-rules check

- engine/app separation: respected; Workshop storage and UI live in app layers, engine gains only injection/registration APIs.
- Web is master, iOS mirrors: engine phases sync byte-identical with tests; UI surfaces are per-platform by design.
- Mandatory web + iOS evaluation: section 6.
- One finding = one commit; iOS push gate: respected per train.
- Privacy-first: local-first, no accounts, no telemetry; the only network-touching phase (W5) is opt-in per submission and deferred to its own owner-gated spec.
- Quality over speed: each phase carries its own full gate; no phase ships half of another's dependencies.
