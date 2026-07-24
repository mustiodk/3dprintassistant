# Web Visible Tip Jar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a visible `Support 3DPA ♥` Ko-fi link immediately after the iOS App link in the production web navigation.

**Architecture:** This is an isolated static web UI change: semantic anchor markup in `index.html`, localization through the existing locale dictionary and `applyTranslations`, and a focused navigation style in `style.css`. No engine, dataset, state, Worker, or backend behavior changes.

**Tech Stack:** HTML, CSS, vanilla JavaScript localization, existing Node/Vitest and walkthrough verification.

## Global Constraints

- Destination is exactly `https://ko-fi.com/3dprintassistant`.
- The support link is immediately after `iOS App ↗`.
- English copy is `Support 3DPA ♥`; Danish copy is `Støt 3DPA ♥`.
- The link opens a new tab with `rel="noopener noreferrer"`.
- No `engine.js`, `data/`, Worker, state, analytics, prompt, or footer change.
- Web may push directly to `main` after review and green verification.

---

### Task 1: Add and localize the support navigation link

**Files:**
- Modify: `index.html`
- Modify: `locales/en.json`
- Modify: `locales/da.json`
- Modify: `app.js`
- Modify: `style.css`

**Interfaces:**
- Consumes: existing `T(key)` locale lookup and `applyTranslations()`.
- Produces: anchor `#navSupport` with `.nav-support` styling and localized text.

- [ ] **Step 1: Confirm the static-link test boundary**

This task adds no JavaScript branch or reusable function. Per the project test
rules, do not add a source-text change detector. The behavior gate is the real
rendered DOM and browser navigation in Task 2.

- [ ] **Step 2: Add the semantic anchor**

Insert this immediately after `#navIOS`:

```html
<a class="nav-btn nav-support" id="navSupport"
   href="https://ko-fi.com/3dprintassistant"
   target="_blank" rel="noopener noreferrer">Support 3DPA &#x2665;</a>
```

- [ ] **Step 3: Add locale keys**

Add `"navSupport": "Support 3DPA"` to `locales/en.json` and
`"navSupport": "Støt 3DPA"` to `locales/da.json`.

- [ ] **Step 4: Localize the rendered label**

In `applyTranslations()`, set:

```javascript
document.getElementById('navSupport').textContent = T('navSupport') + ' ♥';
```

- [ ] **Step 5: Add focused support styling**

Add a `.nav-support` treatment next to `.nav-ios` using existing green tokens,
no new color constants:

```css
.nav-support {
  text-decoration: none;
  color: var(--green);
  margin-left: 4px;
  border-left: 1px solid var(--border2);
}
.nav-support:hover,
.nav-support:focus-visible {
  color: var(--green);
  opacity: 0.85;
}
```

- [ ] **Step 6: Validate locale JSON**

Run:

```bash
node -e "for (const f of ['locales/en.json','locales/da.json']) JSON.parse(require('fs').readFileSync(f, 'utf8'));"
```

Expected: exit 0 with no output.

### Task 2: Verify and publish the web slice

**Files:**
- Verify only: `index.html`, `style.css`, `app.js`, `locales/*.json`

**Interfaces:**
- Consumes: Task 1 rendered link.
- Produces: reviewed production commit and live Cloudflare Pages evidence.

- [ ] **Step 1: Run existing automated tests**

Run:

```bash
npm test -- --run
node scripts/walkthrough-harness.js
```

Expected: both commands exit 0.

- [ ] **Step 2: Prove engine and data isolation**

Run:

```bash
git diff --exit-code origin/main -- engine.js data/
```

Expected: exit 0 with no diff.

- [ ] **Step 3: Browser-check desktop and mobile navigation**

Serve the repo locally, open it in a real browser, switch EN → DA, and verify:

- the link is immediately after `iOS App ↗`;
- labels are `Support 3DPA ♥` and `Støt 3DPA ♥`;
- the `href`, target, and rel values are exact;
- the mobile navigation remains horizontally scrollable;
- keyboard focus is visible.

- [ ] **Step 4: Review the complete web diff**

Compare against `2026-07-25-visible-tip-jar-design.md`. Fix every Critical or
Important review finding, then rerun Steps 1–3.

- [ ] **Step 5: Commit and push**

```bash
git add index.html style.css app.js locales/en.json locales/da.json
git commit -m "feat: add visible Ko-fi support link"
git push origin main
```

- [ ] **Step 6: Verify production**

Poll `https://3dprintassistant.com` until the deployed HTML includes
`#navSupport`, then verify the rendered live navigation in a browser. Record
the production commit SHA and deployment evidence in the session log.

