# 2026-08-17 — Next-gen platform design: My Gear, Inventory, AI Buddy

**Status:** Draft — owner brainstorm complete 2026-08-17; awaiting owner spec review,
then a SYN-17-style adversarial review (hostile sub-agent + cross-model) before any
implementation plan is written.

**Provenance:** Product of an owner-led brainstorm session (2026-08-17, mac-mini
Cowork appdev). The owner explicitly re-opened all four decision families of the
2026-07-12 My 3DPA merged decision set (monetization shape, accounts' role,
identity stack, free/paid boundaries). This spec supersedes the parts of that set
named in §8; everything not named there carries over as reviewed evidence.

**Related:** [#38](https://github.com/mustiodk/3dprintassistant/issues/38) (AI buddy
discovery brief — its D1/D2 gates remain mandatory and are scheduled in §7) ·
[#32](https://github.com/mustiodk/3dprintassistant/issues/32) (modular picker — its
two blocking questions are answered here) ·
[`2026-07-12-my3dpa-merged-decision-set.md`](2026-07-12-my3dpa-merged-decision-set.md)
(prior platform decisions) · `../../3dpa-context.md` (project context).

---

## 1. Product shape — the three tiers

One sentence each, in the user's language:

| Tier | Price | What you get |
|---|---|---|
| **Free** | 0 | Everything free today, plus **My Gear**: pick the printers, filaments and nozzles you own, save named Setups, and the app pre-fills itself. Local, no account needed, forever. |
| **Pro** | one-time IAP (price at D2 gate) | **The workshop manager package.** Contents *grow over time* under the Pro contract below: at Train 2 it is filament inventory (local, this device); Train 3 adds cloud sync of your data (gear, Workshop profiles, inventory); future premium features accrue to every past buyer. |
| **AI credits** | prepaid consumable packs | The **AI 3D Expert Buddy**. Balance lives on your free account, spendable from any signed-in device (iOS first, web fast-follow, macOS if/when it ships). |

Design rationale the tiers encode:

- **Sync alone doesn't sell; inventory does.** Pro is anchored on a *product*
  (inventory) with sync as its multiplier, not on sync as the product (owner call,
  2026-08-17, overturning SYN-10's free-inventory lock).
- **AI has recurring marginal cost; one-time purchases can't fund it.** Prepaid
  credits guarantee positive variable margin on every sale (#38's own baseline
  conclusion). Credit packs reuse the consumable StoreKit rail shipped for the
  Tip Jar in 1.1.3.
- **A credit balance is an account balance, not "synced data".** Users understand
  "balance lives on the account" (like a phone plan) separately from "my data
  syncs with Pro". This is the framing that keeps mixed continuity coherent.

**The Pro contract (binding — resolves review P0-1/P0-4):** Pro is one SKU whose
feature set only ever grows. At any moment, its store listing and purchase
screen describe **only what it includes that day** — a buyer is never charged
for an undelivered promise, so there is nothing to refund against and no
App Review "coming soon" exposure. Every past buyer receives every later Pro
feature at no charge (grandfathering is inherent to the SKU, not a courtesy).
At Train 2, Pro is fully self-contained without any backend: the entitlement is
StoreKit-local, restore is Apple's own non-consumable restore, refunds are
Apple-side and the app re-derives the entitlement from StoreKit current
entitlements on launch (a refunded purchase disappears and the feature locks).
Web/sync portability is added — and only then advertised — at Train 3.

### Account model

- **Nothing local ever requires an account.** Configurator, My Gear, and (for Pro
  buyers) inventory all work signed-out on one device, indefinitely.
- **A free account exists for exactly two things:** carrying the AI credit
  balance (spendable from any signed-in device), and making the Pro entitlement
  portable to non-Apple surfaces (web). Conversations themselves do not sync in
  v1 — see below.
- **Account required only at credit purchase.** The signed-out taster is
  **text-only and hard-capped** (resolves review P0-2), with these numbers
  **ratified here, not deferred**: **5 text questions per device per rolling
  30 days**; platform attestation in front of it (App Attest / DeviceCheck on
  iOS, Turnstile on web — no attestation, no taster); a **global taster pool
  hard cap of USD 10 provider spend per day**, auto-disabling the taster when
  reached (typed "taster unavailable today" response); plus a manual kill
  switch. Worst-case daily cash burn is therefore bounded at $10 by
  construction. The owner may tune these numbers with usage data, but a number
  is always ratified — never open-ended. Pro purchase on iOS works without an
  account (StoreKit local entitlement + Apple restore); signing in is *offered*
  there to make it portable.
- **AI chat history is local per device in v1.** Only the balance is server-side.
  History sync is a candidate future Pro sweetener, not v1 scope.

## 2. Feature: My Gear + Setups (Free tier, Train 1)

Two layers, deliberately distinct because different features consume them:

**Layer 1 — the pool ("what I own"):** printers (several), filaments, nozzles the
user actually has. Consumed by: picker filtering (this train), inventory and AI
grounding (later trains).

**Layer 2 — Setups ("what I print with"):** named combos drawn from the pool —
printer + nozzle + filament, e.g. *"X1C · 0.6 hardened · PETG — functional"*.
One setup is the app-wide default; selecting a setup pre-fills the configurator.
Goals / surface / environment stay per-print questions: **hardware is a setup,
intent is per print.**

UX consequences:

- Returning-user flow collapses from 5 picker steps to: open app → default setup
  loaded → adjust goals → generate.
- Multi-printer users switch setups with one tap (iOS: Home; web: header control).
- Pickers show the user's pool first with everything else behind the existing
  "+N more" pattern; `primary` / `_CORE_*` / `featuredIds` become the
  no-preferences-yet defaults and are not retired (#32 Q7).

Design constraints carried from #32 (binding):

1. **Preference-hiding and correctness-hiding are different layers and must render
   differently.** The engine's compatibility logic always wins; a user filter must
   never be visually confusable with "incompatible".
2. **New catalog entries must break through the filter** — a "N new printers since
   you set this up" affordance, so the intake pipeline's continuous additions stay
   discoverable.
3. **Analytics caveat:** once filters exist, `top_printers`/`top_materials` measure
   filters as much as usage; featured sets stay editorially owned (see #31/#32
   discussion).
4. **App-layer only.** No `engine.js` change, no `data/` change, no byte-mirror
   event, no golden-snapshot movement.

**Setup contents (resolves review P1-5):** a setup is a **partial app-state
preset**, not an informal hardware triple, and it uses the app state's own key
names (`printer`, `nozzle`, `material`, `build_plate`) so applying a setup is a
merge, not a translation. v1 fields: `printer`, `nozzle`, `material`, and
**`build_plate` (optional)** — the engine's warning layer already enforces
plate×printer and plate×material correctness, so the plate belongs to hardware
identity. Goals, surface, strength, speed, environment, support,
colors and user level remain per-print state a setup never pins. `profileMode`
follows the app's existing persistence, not the setup.

**Lifecycle (resolves review P1-6):** pool entries and setups are keyed maps
with `archived_at` flags — never hard-deleted rows. Setups keep denormalized
display labels so a setup referencing an archived pool item (or an id that has
left the catalog) still renders; each setup carries a derived validation state
(`valid` / `missing_pool_ref` / `missing_catalog_ref`) and the UI offers repair
instead of failing. Ordering is stable and explicit.

**Storage (decides #32 Q1):** a new dedicated local store, **`3dpa_gear_v1`**
(web `localStorage`; iOS a Codable JSON file beside the existing app-state
persistence), NOT a section of the Workshop envelope. Rationale: the Workshop
backup file keeps meaning "my saved profiles" (zero risk to existing backups);
gear has a different edit lifecycle; the sync layer later syncs the store as a
unit; inventory follows the same pattern as a sibling store. **The v1 shape ships
versioned and its keys/format are kept forever** (same promise SYN-09 made).

Shape sketch (final schema at plan time):

```json
{
  "schema": "3dpa_gear_v1",
  "printers":  [{ "id": "x1c", "nozzles": ["std_0.4", "hrd_0.6"] }],
  "filaments": [{ "material_id": "petg_basic" }],
  "setups":    [{ "id": "<uuid>", "name": "Functional rig",
                  "printer": "x1c", "nozzle": "hrd_0.6",
                  "material": "petg_basic", "build_plate": "textured_pei" }],
  "default_setup": "<uuid>"
}
```

(Sketch only — the ratified schema at plan time uses the keyed-map + archived
+ denormalized-label lifecycle model above.)

All ids come from the existing catalog vocabularies (`printers.json`,
`materials.json`, `nozzles.json`); no free-text ids.

## 3. Feature: Filament Inventory v1 (Pro headliner, Train 2)

**Scope v1 (deliberately honest and shippable):**

- Add spools: material (catalog vocabulary `material_id`; free-text display name
  allowed but never used for matching), color, brand, spool weight, price
  (optional).
- Track remaining: manual adjustment + a "log usage ≈ N g" quick action after a
  print. Event-sourced under the hood (append-only events, remaining derived by
  folding — the SYN-10 mechanics survive unchanged even though the free/paid
  boundary moved).
- See what you have: grouped by material, low-stock flag.
- **One-time import from bambuinventory** (backlog #040): the field-by-field
  mapping table ratified in July (Claude APD5) is the contract; `import_meta`
  passthrough keeps it lossless.

**Schema ratification requirement (resolves review P1-7):** before the Train 2
implementation plan, the inventory schema is ratified with at least: stable
spool ids and event ids; units (mg integers per the July mechanics — checked
arithmetic, never silently clamped); tare vs net weight; negative-balance
prevention at fold time; deleted/archived-spool behavior for the event journal;
import idempotency keys for the bambuinventory bridge; and formula-injection-
safe CSV export. The `spool_id` linkage reserved for Workshop outcomes in the
July set stays reserved. Directional sketch (ratified shape at the Train 2
plan gate):

```json
{
  "schema": "3dpa_inventory_v1",
  "spools": { "<spool_uuid>": {
    "material_id": "petg_basic", "material_display": "Bambu PETG-HF",
    "color_hex": "1A1A1A", "brand": "Bambu Lab",
    "net_weight_mg": 1000000, "tare_weight_mg": 216000,
    "price": null, "archived_at": null,
    "import_meta": null } },
  "events": [ { "id": "<event_uuid>", "spool": "<spool_uuid>",
    "type": "usage", "delta_mg": -200000,
    "at": "2026-08-17T12:00:00Z", "note": null } ]
}
```

**Explicitly not v1** (stay on backlog): Gmail order intake, AMS/MQTT live state,
humidity sensors, Spoolman sync (#041/#043/#045/#048). bambuinventory remains the
owner's personal power tool; 3dpa reuses its *concepts and data shapes*
(event-sourced remaining, two-band color ideas later), never its PHP/MySQL/Gmail/
MQTT plumbing (reuse boundary carried from SYN-10).

**Entitlement:** Pro is a **non-consumable IAP validated locally by StoreKit** in
Train 2 (same pattern maturity as the shipped Tip Jar; Apple restore covers
device moves). Server-side entitlement (for web + sync) arrives with accounts in
Train 3. Storage: sibling store **`3dpa_inventory_v1`**, same forever-promise as
gear.

**Web:** inventory UI ships on web only when accounts exist (Train 3), because web
cannot know Pro status before then. iOS-first is accepted explicitly.

**Store-listing honesty (binding, from the 1.1.3 recount lesson):** at Train 2,
Pro's ASC listing describes only what it includes *that day* (inventory; local,
this device). Sync is added to the listing when Train 3 ships it — never
pre-sold. Every Pro claim is recounted at each train's submission.

## 4. Feature: AI 3D Expert Buddy (credits, Train 3)

**v1 job scope** (owner-locked 2026-08-17): **Diagnose + Decide + Learn** in one
chat, grounded; **photos from day one** (owner override of the text-only default —
a photo of stringing is the diagnosis; cost difference is priced into credits).

> **Companion spec:** identity/loyalty architecture, model selection, context
> budgets, the apply-loop and the eval suite live in
> [`2026-08-17-ai-buddy-design.md`](2026-08-17-ai-buddy-design.md). That doc
> owns how the buddy works; this section owns tiers, cost rails and sequencing.

| Family | In v1 | Notes |
|---|---|---|
| 🔧 Diagnose | ✅ | "Why did this fail?" — photo + symptoms + exact setup → ranked causes, next steps; follow-ups in-thread; guided calibration walkthroughs |
| 🤔 Decide | ✅ | Material/nozzle/printer choice questions grounded in the catalogs |
| 📚 Learn | ✅ | Explain settings/trade-offs; beginner onboarding |
| 🧪 Plan/Act | ✅ v1 (input-side) / ⏭ v1.5 (value deltas) | **v1: input-side proposal cards** — the buddy proposes changed *configurator answers* (environment, support, nozzle…), user reviews and applies, the **engine regenerates everything** (the buddy cannot directly mutate raw slicer parameters; an engine preflight gates Apply and surfaces any warnings the change would add — companion spec §2). v1.5: output-side value deltas through the existing Workshop tuning ("Mine") rail. Never silent mutation (#38 constraint). Owner-locked 2026-08-17. |
| 🔗 Connected | ⏭ v2 | Inventory-aware ("enough PETG left?"), fleet-aware answers — the moat; needs Trains 1–2 shipped |

**Entry points:** contextual "Ask 3DPA" on Output and Troubleshooter (opens chat
pre-loaded with that context + a visible preview of what will be sent) plus a
chat entry on Home. iOS first; web fast-follow once accounts exist.

**Architecture:**

- All provider calls go through a Cloudflare Worker proxy in the existing web
  repo; **keys never in any client** (#38 hard rule). Provider-abstracted so
  models swap server-side without app releases.
- Model class: cheap multimodal tier (Claude Haiku / Gemini Flash class);
  final pick by the #38 D1 eval, not by default. Streaming responses.
- **Grounding = context-stuffing in v1:** the user's structured state (printer,
  material, nozzle, profile numbers, active engine warnings, provenance) +
  curated 3dpa knowledge. No engine tool-calling in v1 — the engine's outputs
  travel as structured context; the server never runs engine logic.
- Deterministic safety boundary: engine warnings/limits are never overridden by
  the model; safety-critical questions (mains electrics, firmware flashing) get
  escalation/refusal handling; prompt-injection treated as first-class (imported
  profiles and user text are untrusted data).
- Budget enforcement: per-account and global spend ceilings, rate limits,
  provider-outage fallback message. Observability without logging conversation
  content by default.
- **Photos are transient (resolves review P1-8):** the Worker forwards images to
  the provider and never persists them — no R2, no D1 blobs, consistent with
  the no-new-storage-primitives posture. Size caps and EXIF/metadata stripping
  at the edge; the privacy policy states "photos are processed, not stored."
  Server-side photo retention (e.g. for a "my past diagnoses" feature) is a
  future decision that brings R2 + deletion/export machinery with it, never a
  side effect.
- **Context is an allowlisted schema, not ad-hoc stuffing (review P2-10):**
  `ai_context_v1` = catalog ids, numeric profile outputs, warning ids/text,
  provenance labels, and explicitly-marked untrusted user text blocks, with
  hard text/image budgets. Imported third-party profiles and all free text are
  untrusted data by construction.

**Credits:** consumable IAP packs (small/medium/large; SKUs and prices produced
by the #38 D2 business-case gate — the reproducible calculator with p50/p90/
worst-case/abuse rows is still mandatory before SKUs go live). An internal
credit unit maps workloads (text question vs photo diagnosis) to credit costs
transparently before send. Balance is server-side, account-bound; taster
questions are signed-out with their own abuse budget.

**Privacy surface (new, must be designed before beta):** photo upload handling +
retention, conversation retention/deletion, provider subprocessor disclosure,
App Privacy label update, privacy-policy rewrite. The SYN-12 disclosure
discipline (rewrite-not-append, evidence before production GO) applies.

## 5. Platform: accounts, identity, backend

- **Identity stack: Firebase Auth (Apple + Google) remains the default** — it was
  the most heavily reviewed piece of the July set and nothing in this re-open
  produced a reason to leave it. The SYN-17-style adversarial review of THIS spec
  is explicitly asked to challenge that default once more; if it survives, the
  July Firebase bindings (SYN-03 mechanics: RS256 verification, no email in D1,
  fail-closed JWKS caching, SiwA revocation obligation) adopt unchanged.
- **Backend topology carries over from July:** Cloudflare Worker(s) in the web
  repo + one EU-jurisdiction D1 + KV where already designed; new tables for the
  credit ledger (append-only, server-authoritative balance) and AI usage
  accounting. No R2/Queues/DO in v1.
- **Server-side entitlements** (Pro on web, credit balance) arrive with accounts
  in Train 3; StoreKit signed-transaction validation + App Store Server API
  reconciliation per the SYN-16 mechanics, now covering two SKU types
  (non-consumable Pro, consumable credits).
- **Credit ledger semantics (resolves review P0-3):** the balance is derived
  from an append-only, immutable event ledger with the enumerated event types
  `purchase` / `reserve` / `settle` / `release` / `refund` / `revoke` /
  `admin_adjust` — there is no standalone `spend` type; a spend IS the
  `reserve`→`settle` pair defined below. Credits do not expire in v1. A credit purchase grants balance **only after server-side
  StoreKit transaction validation** — no client-asserted grants. Spends are
  server-gated, so negative balances cannot occur; Apple refund notifications
  (ASSN v2) post compensating `refund` events, which may legitimately drive a
  balance to a floor of zero. Family Sharing is disabled for credit SKUs.
  Account deletion with a positive balance warns the user, exports the ledger
  in the account export, and forfeits the balance (credits are spent with
  Apple, not held as user cash — no cash-out path exists). `admin_adjust` is
  the owner-audited support-recovery mechanism and, like every event, cannot
  take a balance below zero (ledger invariant, enforced at append).
  **Spend is two-phase (resolves round-2 P0-3 residual):** each AI request
  carries a client idempotency key; the Worker appends `reserve` (priced
  before send), then `settle` on provider success or `release` on
  failure/timeout — a settle never exceeds its reserve, a retry with the same
  key returns the recorded outcome instead of double-charging, and orphaned
  reserves auto-release after a bounded TTL. The user-visible balance treats
  reserved amounts as unavailable until settled or released.
- **GDPR lifecycle** (export, deletion saga, kill switch) adopts the July SYN-11
  design, extended to cover the credit ledger and AI data.

## 6. What this supersedes in the July decision set

| July decision | Status after this spec |
|---|---|
| SYN-01 sync = Pro (one-time) | **Modified:** Pro = inventory + sync + future premium. One-time shape retained. Credits added as the AI rail. "Never data hostage" posture retained. |
| SYN-10 inventory free, local-first | **Modified:** inventory is Pro. Event-sourced mechanics, vocabulary keying, bambuinventory reuse boundary, and import mapping all retained. Local-first retained (works signed-out on-device for Pro buyers). |
| SYN-02 free-account value | **Modified:** free account = identity + credit balance + entitlement portability (+ AI access). |
| SYN-13 My 3DPA hub | **Retained, resectioned:** hub sections now = Gear, Inventory (Pro), AI & credits, Sync, Account & Privacy. |
| SYN-00 local-first forever, SYN-03 Firebase, SYN-04 device model, SYN-05 topology, SYN-06 PDM2 contract, SYN-07 sync model, SYN-08/11 deletion, SYN-09 stores-forever, SYN-12 privacy, SYN-14 rollout, SYN-16 entitlement mechanics | **Carried over** as reviewed evidence; adopted where their subject matter returns (mostly Train 3). |
| SYN-17 fresh review before implementation | **Re-affirmed for this spec** — see §7 gates. |

## 7. Sequencing — three trains

| Train | Content | Preconditions / gates |
|---|---|---|
| **1 — My Gear + Setups** | Both surfaces (web free push; iOS = the planned next train, likely 1.2.0). Pool + setups + picker filtering + new-item badge. No backend, no account, no engine change. | This spec ratified + adversarially reviewed. Design details via normal writing-plans flow. |
| **2 — Inventory + Pro (iOS)** | `3dpa_inventory_v1`, Pro non-consumable IAP (StoreKit-local under the §1 Pro contract), bambuinventory import. **Parallel backend workstream starts:** accounts + credit ledger + AI proxy on staging; #38 D1 (provider eval) + D2 (business case → SKU table) run here. | Train 1 shipped. Inventory schema ratified (§3). ASC: new IAP + review screenshots (lessons from 1.1.3 applied). **Privacy recount gate (review P2-11):** `privacy.html` + the App Privacy label are recounted against what Train 2 actually collects *before* submission — the current page's "no purchase history" claims predate even the Tip Jar. |
| **3 — AI Buddy (iOS) → web** | Chat + photos + taster + credit packs + sign-in on iOS; then web accounts + web AI; then **sync joins Pro** (gear/inventory/Workshop). | #38 D1/D2 gates green + owner GO (D4) — **gating the AI surface only** (round-2 finding): accounts, web Pro portability and sync ride the same backend but their launch gates are independent of the AI gates, so a delayed or failed AI business case never blocks sync joining Pro. Privacy policy rewrite live before any production collection (July C14-16 rule). Staging canary per SYN-14 discipline. |

Each train is independently shippable and independently valuable. No train
blocks on a later train's unknowns. iOS release mechanics follow the standing
rules (version per release train; push gate; TestFlight manual dispatch).

**Standing-rule check (data/logic-change evaluation):** Trains 1–2 are app-layer
on both surfaces — engine and data untouched, no byte-mirror events. Train 3
reads engine *outputs* as AI context (no engine change); if patch-proposals
(v1.5) later want machine-readable parameter metadata, that becomes a normal
engine-impact evaluation at that train's plan time.

## 8. Out of scope (this whole program)

- Subscriptions (revisit only if credits data demands it).
- Web checkout (web users buy on iOS; revisit on demonstrated web-only demand).
- AMS/printer live integration, Gmail intake, humidity sensors (backlog #041/#048).
- Community/sharing layer (#022), hosted engine API (#044).
- Android (own program, gated on AG0), macOS (backlog #037 — but all account/
  credit design must not preclude it).
- Engine tool-calling for AI v1; AI-initiated profile mutation in any version —
  every change is a user tap on a rendered proposal card: input-side cards in
  v1, Workshop-tuning value deltas in v1.5 (companion spec §2).

## 9. Open questions (to resolve at plan time, not blockers to ratification)

1. Pro price point and credit pack sizes/prices — produced by the D2 calculator,
   presented as the #38 SKU table with margins per usage scenario.
2. ~~Free taster allowance~~ — resolved in §1: 5 text questions / device /
   rolling 30 days, $10/day global pool cap with auto-disable, attested,
   kill-switched. Numbers tunable with data; never open-ended.
3. ~~Setup contents~~ — resolved in §2: partial app-state preset; plate included,
   goals/environment excluded.
4. Gear "new items" badge mechanics (count since last visit vs since setup).
5. iOS train numbering (1.2.0 gear / 1.3.0 inventory / 1.4.0 AI assumed; owner
   confirms at each train start per the version-per-train rule).
6. Whether Train 2's backend workstream lands accounts dark on iOS (shipped but
   UI-off) to de-risk Train 3's App Review pass.

## 10. Review requirements before implementation

Per the re-affirmed SYN-17 discipline and the work-protocol Full lane:

1. **Owner reads and ratifies this spec** (edits welcome — this document is the
   single statement of what we're building).
2. **Adversarial review:** one hostile sub-agent round + one cross-model round
   (`bridge --mode codex-only` per current routing), patch to zero P0–P2.
   Round 1 ran 2026-08-17 (NO-GO, 4 P0 / 5 P1 / 2 P2 — transcript at
   `codex/next-gen-platform-review/bridge-2026-08-17-122452-955169.md`); all
   findings are dispositioned in this revision. A confirmation round on the
   applied fixes is required before ratification.
3. **Identity matrix (review P1-9 — deliberate deferral, accepted as partial):**
   before the Train 3 implementation plan, a short 2026 comparison — Firebase
   vs direct Apple+Google OIDC on Workers/D1 sessions vs Supabase/Auth0-class —
   with the winner's dependency and ops costs explicitly accepted. Deferred on
   purpose: identity is not on Train 1–2's critical path, and a matrix written
   now would be re-litigated against a changed landscape at Train 3 anyway.
   Firebase remains the working default meanwhile.
4. Only then: writing-plans for Train 1 (and only Train 1 — later trains get
   their plans when their turn comes, against then-current reality).
