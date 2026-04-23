#!/usr/bin/env node
// One-shot: extract expected layer_height for MEDIUM-011 correctness-tier tuples.
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.join(__dirname, '..');
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.fetch = async (url) => {
  const rel = String(url).replace(/^\.\//, '');
  const fp = path.join(ROOT, rel);
  try { const c = await fs.promises.readFile(fp, 'utf8');
    return { ok: true, status: 200, url, json: async () => JSON.parse(c), text: async () => c };
  } catch { return { ok: false, status: 404, url, json: async () => null, text: async () => '' }; }
};
const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
vm.runInThisContext(src + '\n;globalThis.__Engine = Engine;\n', { filename: 'engine.js' });
const Engine = globalThis.__Engine;

(async () => {
  await Engine.init();
  const combos = [
    { name: 'ultraClampUp',      printer: 'x1c',           nozzle: 'std_0.4', surface: 'maximum'  },
    { name: 'draftClampDown',    printer: 'a1mini',        nozzle: 'std_0.4', surface: 'draft'    },
    { name: 'standardBaseline',  printer: 'x1c',           nozzle: 'std_0.4', surface: 'standard' },
    { name: 'tightFirmware',     printer: 'ender3_v3_se',  nozzle: 'std_0.4', surface: 'standard' },
    { name: 'coreXyFine',        printer: 'voron_2_4',     nozzle: 'hrd_0.4', surface: 'fine'     },
    { name: 'bedslingerFine',    printer: 'mk4',           nozzle: 'std_0.4', surface: 'fine'     },
    { name: 'bigNozzleDraft',    printer: 'x1c',           nozzle: 'std_0.6', surface: 'draft'    },
    { name: 'smallNozzleFine',   printer: 'x1c',           nozzle: 'prc_0.2', surface: 'fine'     },
  ];
  const printers = Engine.getPrinters ? Engine.getPrinters() : null;
  for (const c of combos) {
    const state = { printer: c.printer, nozzle: c.nozzle, material: 'pla_basic', surface: c.surface, strength: 'standard', speed: 'balanced', environment: 'room_temp', support: 'none', colors: 'single', userLevel: 'intermediate', useCase: [], special: [] };
    const prof = Engine.resolveProfile(state);
    const lh = prof.layer_height ? prof.layer_height.value : '(undef)';
    console.log(`${c.name.padEnd(22)} ${c.printer.padEnd(15)} ${c.nozzle.padEnd(10)} ${c.surface.padEnd(10)} => "${lh}"`);
  }
})().catch(e => { console.error(e); process.exit(1); });
