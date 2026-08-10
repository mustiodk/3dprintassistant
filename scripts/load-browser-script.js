#!/usr/bin/env node
// ─── Loader for root-level browser scripts ───────────────────────────────────
//
// The files at the repo root (engine.js, state-codec.js, workshop-store.js,
// workshop-tuning-rules.js, workshop-tuning.js) are classic browser scripts —
// index.html loads them with plain <script src="..."> tags, in order. They end
// with a CommonJS tail so tests can reach them:
//
//     if (typeof module !== 'undefined' && module.exports) {
//       module.exports = { createWorkshopStore };
//     }
//
// That tail became dead code on 2026-07-18 (`32ef0f0`, the push-consent work),
// which added "type": "module" to the ROOT package.json for the Worker/vitest
// suites. That declaration reclassifies every root .js as ESM, where `module`
// is undefined — so `require('../workshop-store.js')` returns {} and every
// assertion fails with "X is not a function". Four suites (state-codec,
// workshop-store, workshop-tuning, workshop-tuning-rules) were red for 23 days
// because nothing ran them. `scripts/package.json` already pins
// {"type":"commonjs"} for this directory; the root files were never covered.
//
// Renaming them to .cjs is not an option: index.html references them by name,
// so the site would break. Evaluating the raw source is what the browser
// actually does, and it sidesteps module classification completely. This
// mirrors the pattern state-codec.test.js already used for engine.js.
//
// Each script is evaluated in its own function scope rather than the shared
// global one. That is safe for the files this loader targets — workshop-tuning.js
// receives `store` and `rules` as injected parameters rather than reading them as
// globals — and it stops one suite's load from leaking into the next.
//
// SCOPE LIMIT: this is only valid for root scripts that are self-contained and
// export something. It is NOT a general <script> emulator. app.js, for example,
// reads `Engine` from the shared global scope that index.html's ordered script
// tags build up, so loading it here throws "Engine is not defined" — correctly.
// A caller that needs cross-file globals must build that scope explicitly, the
// way state-codec.test.js does for engine.js with vm.runInThisContext.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

/**
 * Load a root-level browser script and return its module.exports.
 *
 * @param {string} filename  Root-relative, e.g. 'workshop-store.js'.
 * @param {string[]} expect  Export names that MUST be present. Empty exports
 *                           and missing names both throw, so a future change
 *                           that silently severs the export tail fails loudly
 *                           instead of degrading into "not a function".
 * @returns {object} the script's module.exports
 */
function loadBrowserScript(filename, expect = []) {
  const abs = path.join(ROOT, filename);

  let src;
  try {
    src = fs.readFileSync(abs, 'utf8');
  } catch (err) {
    throw new Error(
      `load-browser-script: cannot read ${filename} at ${abs} — ${err.message}`
    );
  }

  const mod = { exports: {} };

  // Wrap so the file's own `module.exports = ...` tail has a real `module` to
  // assign to. `filename` is passed through to vm so syntax errors and stack
  // frames point at the real file rather than at this loader.
  let factory;
  try {
    factory = vm.runInThisContext(
      `(function (module, exports) {\n${src}\n;return module.exports;\n})`,
      { filename }
    );
  } catch (err) {
    throw new Error(
      `load-browser-script: ${filename} failed to parse — ${err.message}`
    );
  }

  // Evaluation errors are wrapped so they name the file. Without this, a script
  // that reads a global it never got (see SCOPE LIMIT above) surfaces as a bare
  // "X is not defined" with no indication of which file failed to load.
  let exported;
  try {
    exported = factory(mod, mod.exports);
  } catch (err) {
    throw new Error(
      `load-browser-script: ${filename} threw while evaluating — ${err.message}. ` +
      `If this names an undefined global, the script depends on another root ` +
      `script's scope and cannot be loaded standalone.`
    );
  }

  if (!exported || typeof exported !== 'object' || Object.keys(exported).length === 0) {
    throw new Error(
      `load-browser-script: ${filename} exported nothing. Its CommonJS tail ` +
      `(\`if (typeof module !== 'undefined' && module.exports)\`) is missing or ` +
      `no longer runs. Do NOT "fix" this by renaming the file — index.html ` +
      `loads it as a plain <script>.`
    );
  }

  const missing = expect.filter((name) => !(name in exported));
  if (missing.length > 0) {
    throw new Error(
      `load-browser-script: ${filename} is missing expected export(s): ` +
      `${missing.join(', ')}. Present: ${Object.keys(exported).join(', ') || '(none)'}.`
    );
  }

  return exported;
}

module.exports = { loadBrowserScript, ROOT };
