'use strict';
// Shared engine.js vm bootstrap (extracted from picker-dry-run.js, Gate B2).
//
// Loads engine.js into the current Node process with the same browser-shaped
// globals the web app provides: a no-op localStorage and a LOCAL-FILE fetch
// shim that resolves './data/...' style URLs against a root directory. The
// shim has NO HTTP support by design — callers that need live data (e.g.
// verify-live-picker.js) download it into a temp root first and point this
// bootstrap at that root.
//
// Constraint: engine.js declares `const Engine` at top level, so a process can
// load it exactly ONCE (vm.runInThisContext would throw on redeclaration).
// CLI tools load once per invocation; tests spawn fresh processes.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

/**
 * Install browser-shaped globals and load engine.js from `root`.
 * @param {string} root directory containing engine.js, data/, locales/
 * @returns {object} the Engine module (not yet init()ed)
 */
function loadEngine(root) {
  global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

  global.fetch = async function localFetch(url) {
    if (typeof url !== 'string') throw new Error('engine-bootstrap fetch expects string URL');
    const rel = url.replace(/^\.\//, '');
    const filePath = path.join(root, rel);
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      return { ok: true, status: 200, url, json: async () => JSON.parse(content), text: async () => content };
    } catch (e) {
      return { ok: false, status: 404, url, json: async () => null, text: async () => '' };
    }
  };

  const engineSrc = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
  vm.runInThisContext(engineSrc + '\n;globalThis.__Engine = Engine;\n', { filename: 'engine.js' });
  return globalThis.__Engine;
}

/**
 * Run Engine.init() while capturing its console chatter (k_factor_matrix gap
 * warnings etc. — informational, unrelated to what callers assert).
 * @returns {Promise<{ok: boolean, captured: string[], error?: Error}>}
 */
async function initEngine(Engine) {
  const captured = [];
  const origWarn = console.warn;
  const origLog = console.log;
  console.warn = (...a) => captured.push(a.join(' '));
  console.log = (...a) => captured.push(a.join(' '));
  try {
    await Engine.init();
    return { ok: true, captured };
  } catch (error) {
    return { ok: false, captured, error };
  } finally {
    console.warn = origWarn;
    console.log = origLog;
  }
}

/**
 * Picker-shape assertions shared by picker-dry-run.js (local data) and
 * verify-live-picker.js (production data). Returns human-readable failure
 * strings; empty array = GREEN.
 */
function collectPickerFailures(Engine, { brandId, seriesGroup, printerId, wrongBrandId }) {
  const failures = [];

  const brands = Engine.getBrands();
  const brand = brands.find(b => b.id === brandId);
  if (!brand) {
    failures.push(`brand id '${brandId}' not found in getBrands(); known: ${brands.map(b => b.id).join(', ')}`);
  }

  const groups = Engine.getPrintersByBrand(brandId);
  const group = groups.find(g => g.label === seriesGroup);
  if (!group) {
    failures.push(`series_group '${seriesGroup}' not found under brand '${brandId}'; known: ${groups.map(g => g.label).join(', ') || '(none)'}`);
  }

  const model = group && group.models.find(m => m.id === printerId);
  if (group && !model) {
    failures.push(`printer id '${printerId}' not in group '${seriesGroup}'; group contains: ${group.models.map(m => m.id).join(', ') || '(none)'}`);
  }

  if (wrongBrandId) {
    const spurious = brands.find(b => b.id === wrongBrandId);
    if (spurious) {
      failures.push(`spurious brand '${wrongBrandId}' is registered in getBrands() (taxonomy regression)`);
    }
  }

  return failures;
}

module.exports = { loadEngine, initEngine, collectPickerFailures };
