#!/usr/bin/env node
// ─── Tests for state-codec.js (IMPL-042 Phases A+B) ──────────────────────────
//
// Run: node scripts/state-codec.test.js
//
// Exit 0 on all-green, 1 on any failure.
//
// Loads the real engine.js (same vm bootstrap as walkthrough-harness.js) so
// validateState() is exercised against the live catalogs — never a mock, per
// the IMPL-040 single-source lesson.

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');

// ── Engine bootstrap — identical pattern to walkthrough-harness.js ───────────
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

global.fetch = async function localFetch(url) {
  if (typeof url !== 'string') throw new Error('test fetch expects string URL');
  const rel = url.replace(/^\.\//, '');
  const filePath = path.join(ROOT, rel);
  let content;
  try {
    content = await fs.promises.readFile(filePath, 'utf8');
  } catch (e) {
    return { ok: false, status: 404, url, json: async () => null, text: async () => '' };
  }
  return {
    ok: true,
    status: 200,
    url,
    json: async () => JSON.parse(content),
    text: async () => content,
  };
};

const engineSrc = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
vm.runInThisContext(engineSrc + '\n;globalThis.__Engine = Engine;\n', { filename: 'engine.js' });
const Engine = globalThis.__Engine;

const StateCodec = require(path.join(ROOT, 'state-codec.js'));

let failures = 0;

function check(name, cond, detail) {
  if (cond) {
    console.log(`  ok   ${name}`);
  } else {
    console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`);
    failures++;
  }
}

// Key-order-insensitive deep compare (state objects are plain JSON).
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    const o = {};
    Object.keys(v).sort().forEach(k => { o[k] = canon(v[k]); });
    return o;
  }
  return v;
}
function deepEq(a, b) { return JSON.stringify(canon(a)) === JSON.stringify(canon(b)); }

// A representative fully-configured state, including the 6 extended advanced
// fields (seam, brim, build_plate, extruder_type, filament_condition, ironing).
const FULL_STATE = {
  printer: 'x1c', nozzle: 'std_0.4', material: 'pla_basic',
  useCase: ['functional', 'decorative'], surface: 'standard', strength: 'strong',
  speed: 'balanced', environment: 'cold', support: 'none',
  colors: 'single', userLevel: 'intermediate', special: ['waterproof'],
  seam: 'aligned', brim: 'auto', build_plate: 'textured_pei',
  extruder_type: 'direct_drive', filament_condition: 'unknown', ironing: 'auto',
  profileMode: 'tuned',
};

async function main() {
  try {
    await Engine.init();
  } catch (e) {
    console.error('Engine.init() failed:', e);
    process.exit(1);
  }

  console.log('# state-codec.js tests\n');

  // ── TC1 — storage round-trip of a full state ──
  {
    console.log('TC1 — storage round-trip preserves every field');
    const json    = StateCodec.encodeForStorage(FULL_STATE);
    const decoded = StateCodec.decodeFromStorage(json);
    const clean   = StateCodec.validateState(decoded, Engine);
    check('round-trip deep-equal', deepEq(clean, FULL_STATE),
      `got ${JSON.stringify(clean)}`);
  }

  // ── TC2 — URL round-trip of a full state ──
  {
    console.log('TC2 — URL param round-trip preserves every field');
    const qs      = StateCodec.encodeToParams(FULL_STATE);
    const decoded = StateCodec.decodeFromParams(qs);
    const clean   = StateCodec.validateState(decoded, Engine);
    check('round-trip deep-equal', deepEq(clean, FULL_STATE),
      `qs=${qs} got ${JSON.stringify(clean)}`);
    check('query string uses spec keys p/m/n', /(^|&)p=x1c(&|$)/.test(qs) && /(^|&)m=pla_basic(&|$)/.test(qs) && /(^|&)n=std_0\.4(&|$)/.test(qs), `qs=${qs}`);
    check('null fields omitted from URL', !/(^|&)se=/.test(StateCodec.encodeToParams({ ...FULL_STATE, seam: null })),
      `qs=${StateCodec.encodeToParams({ ...FULL_STATE, seam: null })}`);
  }

  // ── TC3 — unknown-id degradation: bad ids drop to default, valid ids kept ──
  {
    console.log('TC3 — unknown ids degrade to defaults without dropping valid fields');
    const clean = StateCodec.validateState({
      ...FULL_STATE,
      printer: 'retired_printer_xyz',
      surface: 'not_a_surface',
      useCase: ['functional', 'not_a_use_case'],
    }, Engine);
    check('unknown printer → null', clean.printer === null, `got ${clean.printer}`);
    check('unknown surface → null', clean.surface === null, `got ${clean.surface}`);
    check('useCase filtered to valid members', deepEq(clean.useCase, ['functional']),
      `got ${JSON.stringify(clean.useCase)}`);
    check('valid material survives', clean.material === 'pla_basic', `got ${clean.material}`);
    check('valid nozzle survives', clean.nozzle === 'std_0.4', `got ${clean.nozzle}`);
  }

  // ── TC4 — corrupt / wrong-version storage returns null ──
  {
    console.log('TC4 — corrupt storage handling');
    check('garbage JSON → null', StateCodec.decodeFromStorage('{not json!') === null);
    check('non-object JSON → null', StateCodec.decodeFromStorage('"hi"') === null);
    check('wrong version envelope → null', StateCodec.decodeFromStorage('{"v":99,"state":{}}') === null);
    check('missing state member → null', StateCodec.decodeFromStorage('{"v":1}') === null);
  }

  // ── TC5 — empty / garbage URL params ──
  {
    console.log('TC5 — empty and garbage URL handling');
    check('empty string → empty object', deepEq(StateCodec.decodeFromParams(''), {}));
    const junk = StateCodec.decodeFromParams('?wtf=1&p=&utm_source=discord');
    check('unknown + empty params ignored', deepEq(junk, {}), `got ${JSON.stringify(junk)}`);
    const cleanJunk = StateCodec.validateState(junk, Engine);
    check('validate(garbage) yields full default shape',
      cleanJunk.printer === null && deepEq(cleanJunk.useCase, []) && deepEq(cleanJunk.special, []),
      `got ${JSON.stringify(cleanJunk)}`);
    check('default shape has every state key', Object.keys(FULL_STATE).every(k => k in cleanJunk),
      `missing: ${Object.keys(FULL_STATE).filter(k => !(k in cleanJunk)).join(',')}`);
  }

  // ── TC6 — csv multi-field handling on the URL side ──
  {
    console.log('TC6 — csv useCase/special handling');
    const decoded = StateCodec.decodeFromParams('?uc=functional,decorative&x=waterproof,matte');
    check('uc csv → array', deepEq(decoded.useCase, ['functional', 'decorative']),
      `got ${JSON.stringify(decoded.useCase)}`);
    check('x csv → array', deepEq(decoded.special, ['waterproof', 'matte']),
      `got ${JSON.stringify(decoded.special)}`);
    const clean = StateCodec.validateState({ useCase: 'not-an-array' }, Engine);
    check('non-array multi value degrades to []', deepEq(clean.useCase, []),
      `got ${JSON.stringify(clean.useCase)}`);
  }

  // ── TC7 — minimal state round-trips without noise ──
  {
    console.log('TC7 — minimal (printer-only) state round-trip');
    const minimal = StateCodec.validateState({ printer: 'a1' }, Engine);
    const qs = StateCodec.encodeToParams(minimal);
    check('only p param emitted', qs === 'p=a1', `got ${qs}`);
    const back = StateCodec.validateState(StateCodec.decodeFromParams('?' + qs), Engine);
    check('round-trip keeps printer', back.printer === 'a1', `got ${back.printer}`);
  }

  // ── TC8 — [IMPL-044 W3] profileMode 'mine' codec rules ──
  {
    console.log('TC8 — W3 mine mode: share-encode maps mine→safe; storage + validate keep it');
    const st = StateCodec.defaultState();
    st.printer = 'a1'; st.profileMode = 'mine';
    const qs = StateCodec.encodeToParams(st);
    check('share URL maps mine→safe (personal offsets never ride share URLs)',
      /(^|&)pm=safe(&|$)/.test(qs), `got ${qs}`);
    const stored = JSON.parse(StateCodec.encodeForStorage(st)).state;
    check('storage keeps mine (session persistence)', stored.profileMode === 'mine',
      `got ${stored.profileMode}`);
    const clean = StateCodec.validateState({ profileMode: 'mine' }, Engine);
    check('validateState accepts mine (app boot guard degrades when unavailable)',
      clean.profileMode === 'mine', `got ${clean.profileMode}`);
    const bad = StateCodec.validateState({ profileMode: 'bogus' }, Engine);
    check('unknown mode still degrades to default', bad.profileMode === null,
      `got ${bad.profileMode}`);
  }

  console.log('');
  if (failures === 0) {
    console.log('ALL TESTS PASS');
    process.exit(0);
  } else {
    console.log(`${failures} TEST(S) FAILED`);
    process.exit(1);
  }
}

main();
