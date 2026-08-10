#!/usr/bin/env node
// ─── The browser's actual contract between the root scripts ──────────────────
//
// Run: node scripts/browser-globals.test.js
//
// WHY THIS EXISTS. The other root-script suites (workshop-store, workshop-tuning,
// state-codec, workshop-tuning-rules) reach their subject through
// load-browser-script.js, which validates `module.exports`. That is NOT the
// surface the shipped app consumes. index.html loads these files as ordered
// plain <script> tags, so they communicate through the SHARED GLOBAL SCOPE, and
// app.js reads them as bare globals:
//
//   app.js:199  StateCodec.encodeForStorage(state)
//   app.js:888  if (!_workshopTuning && WorkshopStore && typeof createWorkshopTuning !== 'undefined')
//
// Note that app.js wants `WorkshopStore` — the ready-made INSTANCE built at
// workshop-store.js:274 from `localStorage` — not the `createWorkshopStore`
// factory that module.exports exposes. The two surfaces are genuinely
// different, and only one of them is what users run.
//
// The gap this closes: change a script's export tail to
// `module.exports = { createWorkshopTuning: SomeRenamedThing }` and every
// existing suite stays green while the browser silently loses tuning. This
// suite fails in that scenario, because it evaluates the scripts the way
// index.html does — one shared context, index.html's order — and then asserts
// the globals app.js actually reads.
//
// Raised as P1 by an independent cross-model review of the CI work, and
// confirmed against app.js before being written.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');

let failures = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log(`  ok   ${name}`);
  } else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    failures++;
  }
}

console.log('# browser global contract');

// ── Derive the script list from index.html rather than hardcoding it, so a new
//    <script> tag is covered automatically and a reordering is detected.
const html = fs.readFileSync(INDEX, 'utf8');
const srcs = [...html.matchAll(/<script\s+src="([^"]+)"><\/script>/g)].map((m) => m[1]);

// app.js is the CONSUMER, not a provider. Loading it would require a live DOM;
// this suite proves the scope app.js is handed, not app.js itself.
const providers = srcs.filter((s) => s !== 'app.js' && !/^https?:/.test(s));

check('index.html declares script tags', srcs.length > 0, `found ${srcs.length}`);
check('app.js is loaded last', srcs[srcs.length - 1] === 'app.js', `last is ${srcs[srcs.length - 1]}`);

// ── Build one shared global scope and evaluate the providers into it, in the
//    order index.html declares. This is the browser's model: no modules, no
//    per-file isolation, later scripts see earlier scripts' top-level bindings.
const sandbox = {
  console,
  // The browser has localStorage; workshop-store.js branches on it at load time
  // to decide whether to build the WorkshopStore instance. Without a stand-in,
  // that global would be null here and the assertion below would be vacuous.
  localStorage: (() => {
    const map = new Map();
    return {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => void map.set(k, String(v)),
      removeItem: (k) => void map.delete(k),
      clear: () => map.clear(),
    };
  })(),
  window: { location: { search: '' } },
  document: { addEventListener() {} },
};
sandbox.globalThis = sandbox;
const context = vm.createContext(sandbox);

for (const src of providers) {
  const abs = path.join(ROOT, src);
  if (!fs.existsSync(abs)) {
    check(`${src} exists`, false, `index.html references a missing file: ${abs}`);
    continue;
  }
  try {
    // `var`/function declarations land on the context object exactly as in a
    // browser. `const`/`let` at script top level go to the shared script scope,
    // which vm models per-context, so later scripts still see them.
    new vm.Script(fs.readFileSync(abs, 'utf8'), { filename: src }).runInContext(context);
    check(`${src} evaluates in shared scope`, true);
  } catch (err) {
    check(`${src} evaluates in shared scope`, false, err.message);
  }
}

// ── The assertions that matter: exactly what app.js reaches for.
//    Sourced from app.js, not from the scripts' own export lists.
const expectations = [
  ['StateCodec', 'object', 'app.js:199 StateCodec.encodeForStorage'],
  ['WorkshopStore', 'object', 'app.js:888 — the INSTANCE, not the factory'],
  ['createWorkshopTuning', 'function', 'app.js:888 typeof createWorkshopTuning'],
];

for (const [name, kind, why] of expectations) {
  let value;
  try {
    value = vm.runInContext(`typeof ${name} === 'undefined' ? undefined : ${name}`, context);
  } catch (err) {
    check(`global ${name}`, false, err.message);
    continue;
  }
  check(`global ${name} is a ${kind}  (${why})`, value !== undefined && typeof value === kind,
    `got ${value === undefined ? 'undefined' : typeof value}`);
}

// StateCodec's methods are reached directly off the global by app.js.
for (const m of ['encodeForStorage', 'decodeFromStorage', 'validateState', 'encodeForShare']) {
  const ok = vm.runInContext(
    `typeof StateCodec !== 'undefined' && typeof StateCodec.${m} === 'function'`, context);
  check(`StateCodec.${m} is callable from the global scope`, ok);
}

console.log(failures === 0 ? '\nALL TESTS PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
