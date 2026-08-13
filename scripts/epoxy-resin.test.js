#!/usr/bin/env node
// Issue #35 — canonical epoxy_resin build-plate contract.
//
// This fixture deliberately does NOT add Creality Hi to the shipped catalog:
// #29 stays parked. It injects the smallest in-memory printer row needed to
// prove that a future Hi row carrying available_plates:["epoxy_resin"] will
// pass the physical printer × plate guard once its normal intake gates open.

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const HI_FIXTURE_ID = 'hi_issue_35_fixture';

global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.fetch = async function localFetch(url) {
  if (typeof url !== 'string') throw new Error('epoxy-resin fetch expects a string URL');
  const filePath = path.join(ROOT, url.replace(/^\.\//, ''));
  let content;
  try { content = await fs.promises.readFile(filePath, 'utf8'); }
  catch { return { ok: false, status: 404, url, json: async () => null, text: async () => '' }; }

  if (url.replace(/^\.\//, '') === 'data/printers.json') {
    const doc = JSON.parse(content);
    const base = doc.printers.find((printer) => printer.id === 'ender3_v3_se');
    assert.ok(base, 'fixture source printer must exist');
    doc.printers.push({
      ...base,
      id: HI_FIXTURE_ID,
      name: 'Creality Hi (issue #35 fixture)',
      available_plates: ['epoxy_resin'],
    });
    content = JSON.stringify(doc);
  }

  return {
    ok: true,
    status: 200,
    url,
    json: async () => JSON.parse(content),
    text: async () => content,
  };
};

const source = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
vm.runInThisContext(`${source}\n;globalThis.__Issue35Engine = Engine;\n`, { filename: 'engine.js' });
const Engine = globalThis.__Issue35Engine;

let passing = 0;
let failing = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passing += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    failing += 1;
    failures.push(`${name}: ${error.message}`);
    console.log(`  FAIL ${name} — ${error.message}`);
  }
}

function stateFor(material, overrides = {}) {
  return {
    printer: HI_FIXTURE_ID,
    nozzle: 'std_0.4',
    material,
    useCase: ['functional'],
    surface: 'standard',
    strength: 'standard',
    speed: 'balanced',
    environment: 'normal',
    support: 'none',
    colors: 'single',
    userLevel: 'intermediate',
    special: [],
    build_plate: 'epoxy_resin',
    ...overrides,
  };
}

(async function main() {
  await Engine.init();

  console.log('\nTC1 — web picker and localized guidance');
  await test('English filter exposes canonical epoxy_resin id, label, and guidance', () => {
    Engine.setLang('en');
    const group = Engine.getFilters().find((entry) => entry.key === 'build_plate');
    const plate = group?.items.find((entry) => entry.id === 'epoxy_resin');
    assert.deepStrictEqual(plate, {
      id: 'epoxy_resin',
      name: 'Epoxy Resin',
      desc: 'Durable sandblasted coating with strong adhesion and easy flex-release.',
    });
  });

  await test('Danish filter exposes localized epoxy-resin label and guidance', () => {
    Engine.setLang('da');
    const group = Engine.getFilters().find((entry) => entry.key === 'build_plate');
    const plate = group?.items.find((entry) => entry.id === 'epoxy_resin');
    assert.deepStrictEqual(plate, {
      id: 'epoxy_resin',
      name: 'Epoxyharpiks',
      desc: 'Slidstærk, sandblæst belægning med høj vedhæftning og nem frigørelse ved bøjning.',
    });
  });

  console.log('\nTC2 — every supported material group has an explicit rating');
  const expectedRatings = new Map([
    ['pla_basic', 'good'],
    ['petg_basic', 'good'],
    ['abs', 'good'],
    ['asa', 'good'],
    ['tpu_95a', 'good'],
    ['pa', 'good'],
    ['pc', 'good'],
    ['pva', 'good'],
    ['pet_cf', 'good'],
    ['hips', 'avoid'],
  ]);
  for (const [materialId, expected] of expectedRatings) {
    await test(`${materialId} is explicitly rated ${expected}`, () => {
      assert.strictEqual(
        Engine.getBuildPlateCompatibility(materialId, 'epoxy_resin'),
        expected,
      );
    });
  }

  console.log('\nTC3 — physical guard and conservative HIPS behavior');
  await test('synthetic Hi+epoxy does not emit plate_not_on_printer', () => {
    const ids = Engine.getWarnings(stateFor('pla_basic')).map((warning) => warning.id);
    assert.ok(!ids.includes('plate_not_on_printer'), `unexpected warning ids: ${ids.join(', ')}`);
  });
  await test('HIPS+epoxy emits build_plate_avoid', () => {
    const warnings = Engine.getWarnings(stateFor('hips'));
    const ids = warnings.map((warning) => warning.id);
    assert.ok(ids.includes('build_plate_avoid'), `warning ids: ${ids.join(', ')}`);
    const detail = warnings.find((warning) => warning.id === 'build_plate_avoid')?.detail || '';
    assert.match(detail, /this material/i,
      'plate-level guidance must remain correct if another material group becomes avoid');
    assert.doesNotMatch(detail, /HIPS/i,
      'plate-level guidance must not hardcode today\'s only avoid-rated material');
  });

  console.log(`\n[epoxy-resin] ${passing} passing, ${failing} failing`);
  if (failing) {
    console.log('\nFailures:');
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exit(1);
  }
})().catch((error) => { console.error(error); process.exit(1); });
