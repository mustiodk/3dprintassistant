#!/usr/bin/env node
// ─── 3D Print Assistant — Domain walkthrough harness ─────────────────────────
// Loads engine.js in Node, runs resolveProfile + getWarnings + getFilters +
// getChecklist for a fixed set of real printer × nozzle × material × goals
// combos, and emits a structured markdown report.
//
// Reusable for future audits — add combos to COMBOS[] at bottom and re-run.
//
// Run: node scripts/walkthrough-harness.js > docs/reviews/.../domain-walkthrough.md

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');

// ─── Engine bootstrap — polyfill fetch + localStorage, then eval engine.js ──
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

global.fetch = async function localFetch(url) {
  if (typeof url !== 'string') throw new Error('harness fetch expects string URL');
  // Strip leading './'
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

// engine.js declares `const Engine = (() => { ... })();` at module scope.
// vm.runInThisContext scopes `const` to the run, so append a line that
// publishes it onto globalThis before evaluation ends.
const engineSrc = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
vm.runInThisContext(engineSrc + '\n;globalThis.__Engine = Engine;\n', { filename: 'engine.js' });
const Engine = globalThis.__Engine;

// ─── Report helpers ─────────────────────────────────────────────────────────

function h1(s)   { return `# ${s}\n\n`; }
function h2(s)   { return `## ${s}\n\n`; }
function h3(s)   { return `### ${s}\n\n`; }
function bold(s) { return `**${s}**`; }
function code(s) { return `\`${s}\``; }

// Keys of interest — kept short so the report stays scannable. Everything
// else is dumped to a JSON appendix for full audit.
const PARAMS_OF_INTEREST = [
  'layer_height',
  'initial_layer_height',
  'line_width',
  'wall_loops',
  'top_shell_layers',
  'bottom_shell_layers',
  'sparse_infill_density',
  'sparse_infill_pattern',
  'top_surface_pattern',
  'internal_solid_infill_pattern',
  'outer_wall_speed',
  'inner_wall_speed',
  'infill_speed',
  'travel_speed',
  'initial_layer_speed',
  'nozzle_temperature',
  'nozzle_temperature_initial_layer',
  'bed_temperature',
  'bed_temperature_initial_layer',
  'retraction_distance',
  'retraction_speed',
  'max_volumetric_speed',
  'fan_max_speed',
  'fan_min_speed',
  'enable_overhang_cooling',
  'support_type',
];

function fmtParam(p) {
  if (p == null) return '—';
  if (typeof p !== 'object') return String(p);
  const val = p.value != null ? String(p.value) : '—';
  return val;
}

function fmtWhy(p) {
  if (!p || typeof p !== 'object') return '';
  return p.why || '';
}

function runCombo(combo) {
  const state = combo.state;
  const printer = Engine.getPrinter(state.printer);
  const nozzle  = Engine.getNozzle(state.nozzle);
  const mat     = Engine.getMaterial(state.material);
  const slicer  = Engine.getSlicerForPrinter(state.printer);

  // Activate slicer so PROFILE_TABS / PARAM_LABELS resolve correctly for this combo
  Engine.setActiveSlicer(slicer);

  const profile   = Engine.resolveProfile(state);
  const warnings  = Engine.getWarnings(state);
  const filters   = Engine.getFilters(state);
  const checklist = Engine.getChecklist(state);
  const advFil    = Engine.getAdvancedFilamentSettings(state);

  // Find chip descs for the currently-selected surface / strength / speed.
  // Filter groups use `key` (not `id`) — items use `id`.
  function findChip(groupKey, itemId) {
    const g = filters.find(f => f.key === groupKey);
    if (!g) return null;
    return g.items.find(i => i.id === itemId) || null;
  }
  const chipSurface  = findChip('surface',  state.surface);
  const chipStrength = findChip('strength', state.strength);
  const chipSpeed    = findChip('speed',    state.speed);

  // Also capture whether combo's chip descs embed the correct emitted numbers
  const chipParityIssues = [];
  const lh = profile.layer_height?.value;
  const lhNum = lh != null ? parseFloat(String(lh).match(/[\d.]+/)?.[0] || 'NaN') : null;
  if (chipSurface?.desc && lhNum != null) {
    const m = chipSurface.desc.match(/([\d.]+)\s*mm/);
    if (m) {
      const chipNum = parseFloat(m[1]);
      if (Math.abs(chipNum - lhNum) > 1e-6) {
        chipParityIssues.push({ field: 'surface layer_height', chipNum, emittedNum: lhNum });
      }
    }
  }

  return {
    combo,
    printer, nozzle, mat, slicer,
    profile, warnings, filters, checklist, advFil,
    chipSurface, chipStrength, chipSpeed, chipParityIssues,
  };
}

function renderComboSection(r) {
  const { combo, printer, nozzle, mat, slicer, profile, warnings, checklist, advFil } = r;
  const { chipSurface, chipStrength, chipSpeed } = r;

  let out = '';
  out += h2(`Combo ${combo.id} — ${combo.label}`);

  out += `${bold('State:')} printer=\`${combo.state.printer}\`, nozzle=\`${combo.state.nozzle}\`, material=\`${combo.state.material}\`  \n`;
  out += `${bold('Goals:')} surface=${combo.state.surface}, strength=${combo.state.strength}, speed=${combo.state.speed}, env=${combo.state.environment}, support=${combo.state.support}  \n`;
  out += `${bold('Slicer:')} \`${slicer}\`  \n`;

  // Context block
  out += '\n<details><summary>Printer + material context</summary>\n\n';
  if (printer) {
    out += `- Printer: ${printer.name} — series=${printer.series}, enclosure=${printer.enclosure}, extruder=${printer.extruder_type}\n`;
    out += `- Caps: max_speed=${printer.max_speed}, max_accel=${printer.max_acceleration}, max_noz_t=${printer.max_nozzle_temp}, max_bed_t=${printer.max_bed_temp}\n`;
    out += `- Available nozzles: ${JSON.stringify(printer.available_nozzle_sizes)}\n`;
  }
  if (nozzle) {
    out += `- Nozzle: ${nozzle.name} — size=${nozzle.size}, material=${nozzle.material}, hardened=${nozzle.hardened}\n`;
  }
  if (mat) {
    const bs = mat.base_settings;
    out += `- Material: ${mat.name} — group=${mat.group}, difficulty=${mat.difficulty}, ams_compatible=${mat.ams_compatible}\n`;
    out += `- Temp ranges: nozzle ${bs.nozzle_temp_min}–${bs.nozzle_temp_base}–${bs.nozzle_temp_max}, bed ${bs.bed_temp_min}–${bs.bed_temp_base}–${bs.bed_temp_max}\n`;
    out += `- Retraction: length=${bs.retraction_length}, speed=${bs.retraction_speed}, max=${mat.retraction_max}\n`;
    out += `- max_mvs by nozzle: ${JSON.stringify(bs.max_mvs || {})}\n`;
    if (mat.enclosure_required) out += `- ⚠ enclosure_required=true\n`;
    if (mat.ventilation_required) out += `- ⚠ ventilation_required=true\n`;
    if (mat.nozzle_requirements) out += `- Nozzle requirement: ${JSON.stringify(mat.nozzle_requirements)}\n`;
  }
  out += '\n</details>\n\n';

  // Emitted profile
  out += h3('Emitted profile (key params)');
  out += '| Param | Value | Mode | Why |\n|---|---|---|---|\n';
  for (const k of PARAMS_OF_INTEREST) {
    const p = profile[k];
    if (!p) continue;
    const value = fmtParam(p).replace(/\|/g, '\\|');
    const why   = fmtWhy(p).replace(/\|/g, '\\|');
    out += `| ${k} | ${value} | ${p.mode || '—'} | ${why} |\n`;
  }
  out += '\n';

  // Advanced filament settings (where temps + MVS actually live)
  out += h3('Advanced filament settings (the filament preset — temps, retraction, PA)');
  if (advFil) {
    out += '| Key | Value |\n|---|---|\n';
    for (const [k, v] of Object.entries(advFil)) {
      if (v == null) continue;
      out += `| ${k} | ${String(v).replace(/\|/g, '\\|')} |\n`;
    }
    out += '\n';
  }

  // Warnings
  out += h3(`Warnings fired (${warnings.length})`);
  if (warnings.length === 0) {
    out += '_No warnings._\n\n';
  } else {
    for (const w of warnings) {
      out += `- ${bold(`[${w.id}]`)} ${w.text || '(no text)'}`;
      if (w.detail) out += ` — ${w.detail}`;
      if (w.fix) out += ` — ${bold('Fix:')} ${w.fix}`;
      out += '\n';
    }
    out += '\n';
  }

  // Checklist
  out += h3(`Checklist (${checklist.length})`);
  if (checklist.length === 0) {
    out += '_Empty._\n\n';
  } else {
    for (const c of checklist) {
      out += `- ${c.critical ? '⚠ ' : ''}${c.text}`;
      if (c.detail) out += ` — ${c.detail}`;
      out += '\n';
    }
    out += '\n';
  }

  // Chip desc parity
  out += h3('Chip descs (IMPL-040 visibility)');
  const chip = (name, c) => {
    if (!c) return `- ${name}: _not found_\n`;
    return `- ${name}: "${c.desc || ''}"\n`;
  };
  out += chip(`surface="${combo.state.surface}"`, chipSurface);
  out += chip(`strength="${combo.state.strength}"`, chipStrength);
  out += chip(`speed="${combo.state.speed}"`, chipSpeed);
  out += '\n';

  // Automated checks
  out += h3('Automated checks');
  const checks = automatedChecks(r);
  if (checks.length === 0) {
    out += '_All automated checks passed._\n\n';
  } else {
    for (const c of checks) {
      out += `- ${c.severity === 'fail' ? '❌' : c.severity === 'warn' ? '⚠' : 'ℹ'} ${c.label}: ${c.message}\n`;
    }
    out += '\n';
  }

  return out;
}

// ─── Automated checks — purely structural / arithmetic, not domain judgment ──

function automatedChecks(r) {
  const checks = [];
  const { printer, nozzle, mat, profile, advFil, warnings, combo } = r;
  const getNum = (paramKey) => {
    const p = profile[paramKey];
    if (!p || p.value == null) return null;
    const m = String(p.value).match(/-?[\d.]+/);
    return m ? parseFloat(m[0]) : null;
  };
  const getAdvNum = (key) => {
    const v = advFil?.[key];
    if (v == null) return null;
    const m = String(v).match(/-?[\d.]+/);
    return m ? parseFloat(m[0]) : null;
  };

  // 0. Silent-invalid-preset check — if a `simple` profile param emits undefined,
  //    that's the signature of an unknown preset ID falling through.
  const simpleUndefined = Object.entries(profile).filter(([k, v]) => v && v.mode === 'simple' && (v.value == null || v.value === 'undefined'));
  if (simpleUndefined.length > 0) {
    checks.push({ severity: 'fail', label: 'simple params have undefined value', message: `undefined on: ${simpleUndefined.map(([k])=>k).join(', ')} — likely an unknown preset ID in state` });
  }

  // 0b. Verify combo state uses valid preset IDs
  const filterKeys = r.filters.map(g => g.key);
  ['surface','strength','speed'].forEach(k => {
    const g = r.filters.find(f => f.key === k);
    if (!g) return;
    const selected = combo.state[k];
    if (selected && !g.items.some(i => i.id === selected)) {
      checks.push({ severity: 'fail', label: `invalid ${k} preset`, message: `state.${k}="${selected}" not in valid items [${g.items.map(i=>i.id).join(', ')}]` });
    }
  });

  // 1. layer_height within nozzle × 0.25 … nozzle × 0.70 (or override if present)
  const lh = getNum('layer_height');
  if (lh != null && nozzle) {
    const maxLH = +(nozzle.size * 0.70).toFixed(3);
    const minLH = +(nozzle.size * 0.25).toFixed(3);
    if (lh > maxLH + 1e-9) checks.push({ severity: 'fail', label: 'layer_height > formula max', message: `${lh} > ${maxLH} (nozzle ${nozzle.size} × 0.70)` });
    if (lh < minLH - 1e-9) checks.push({ severity: 'fail', label: 'layer_height < formula min', message: `${lh} < ${minLH} (nozzle ${nozzle.size} × 0.25)` });
  }

  // 2. bed_temperature within printer.max_bed_temp (read from advFil — temps
  //    live in filament preset, not process preset)
  const bt  = getAdvNum('other_layers_bed_temp');
  const bt0 = getAdvNum('initial_layer_bed_temp');
  if (bt != null && printer?.max_bed_temp != null && bt > printer.max_bed_temp) {
    checks.push({ severity: 'fail', label: 'other_layers_bed_temp > printer.max_bed_temp', message: `${bt}°C > ${printer.max_bed_temp}°C (printer cap)` });
  }
  if (bt0 != null && printer?.max_bed_temp != null && bt0 > printer.max_bed_temp) {
    checks.push({ severity: 'fail', label: 'initial_layer_bed_temp > printer.max_bed_temp', message: `${bt0}°C > ${printer.max_bed_temp}°C (printer cap)` });
  }

  // 3. nozzle_temperature within printer.max_nozzle_temp
  const nt  = getAdvNum('other_layers_temp');
  const nt0 = getAdvNum('initial_layer_temp');
  if (nt != null && printer?.max_nozzle_temp != null && nt > printer.max_nozzle_temp) {
    checks.push({ severity: 'fail', label: 'other_layers_temp > printer.max_nozzle_temp', message: `${nt}°C > ${printer.max_nozzle_temp}°C (printer cap)` });
  }
  if (nt0 != null && printer?.max_nozzle_temp != null && nt0 > printer.max_nozzle_temp) {
    checks.push({ severity: 'fail', label: 'initial_layer_temp > printer.max_nozzle_temp', message: `${nt0}°C > ${printer.max_nozzle_temp}°C (printer cap)` });
  }

  // 4. bed_temperature within material safe range
  if (bt != null && mat?.base_settings) {
    const bs = mat.base_settings;
    if (bt > bs.bed_temp_max) checks.push({ severity: 'warn', label: 'other_layers_bed_temp > material.bed_temp_max', message: `${bt}°C > ${bs.bed_temp_max}°C` });
    if (bt < bs.bed_temp_min) checks.push({ severity: 'warn', label: 'other_layers_bed_temp < material.bed_temp_min', message: `${bt}°C < ${bs.bed_temp_min}°C` });
  }

  // 5. nozzle_temperature within material safe range
  if (nt != null && mat?.base_settings) {
    const bs = mat.base_settings;
    if (nt > bs.nozzle_temp_max) checks.push({ severity: 'warn', label: 'other_layers_temp > material.nozzle_temp_max', message: `${nt}°C > ${bs.nozzle_temp_max}°C` });
    if (nt < bs.nozzle_temp_min) checks.push({ severity: 'warn', label: 'other_layers_temp < material.nozzle_temp_min', message: `${nt}°C < ${bs.nozzle_temp_min}°C` });
  }

  // 6. outer_wall_speed within printer.max_speed
  const ow = getNum('outer_wall_speed');
  if (ow != null && printer?.max_speed != null) {
    if (ow > printer.max_speed) checks.push({ severity: 'fail', label: 'outer_wall_speed > printer.max_speed', message: `${ow} > ${printer.max_speed}` });
  }

  // 7. Enclosure check — enclosure_required materials on open-frame printers
  if (mat?.enclosure_required && printer?.enclosure === 'none') {
    const hasEnclosureWarning = warnings.some(w => /enclosure/i.test(w.id + ' ' + (w.text || '')));
    if (!hasEnclosureWarning) {
      checks.push({ severity: 'fail', label: 'enclosure warning missing', message: `material requires enclosure, printer has none, but no warning fires` });
    }
  }

  // 8. Abrasive-material + soft-nozzle check
  if (mat?.nozzle_requirements?.material === 'hardened' && nozzle?.hardened === false) {
    const hasAbrasiveWarning = warnings.some(w => /hard|abrasive|nozzle/i.test(w.id + ' ' + (w.text || '')));
    if (!hasAbrasiveWarning) {
      checks.push({ severity: 'fail', label: 'abrasive-nozzle warning missing', message: `material needs hardened nozzle, ${nozzle?.name} is not hardened, no warning` });
    }
  }

  // 9. Retraction scaling check — retraction_distance should differ from base
  //    retraction_length when nozzle != 0.4
  if (nozzle && mat?.base_settings && nozzle.size !== 0.4) {
    const rd = getNum('retraction_distance');
    const baseRd = mat.base_settings.retraction_length;
    if (rd != null && baseRd != null && Math.abs(rd - baseRd) < 1e-6) {
      checks.push({ severity: 'warn', label: 'retraction not scaled for nozzle', message: `nozzle=${nozzle.size} but retraction_distance=${rd} matches base ${baseRd}` });
    }
  }

  // 10. IMPL-040 chip desc parity — report pre-collected parity issues
  for (const p of r.chipParityIssues || []) {
    checks.push({ severity: 'fail', label: 'IMPL-040 drift: chip ≠ emission', message: `${p.field}: chip says ${p.chipNum} mm, profile emits ${p.emittedNum} mm` });
  }

  // 11. Simple-mode speed params non-null — catches invalid-preset silent
  //     fallback path (see combo-state check above)
  ['outer_wall_speed','inner_wall_speed'].forEach(k => {
    const p = r.profile[k];
    if (p && p.mode === 'simple' && (p.value == null || String(p.value).toLowerCase() === 'undefined')) {
      checks.push({ severity: 'fail', label: `${k} emitted undefined`, message: `silent fallback — check combo state` });
    }
  });

  return checks;
}

// ─── Combos ─────────────────────────────────────────────────────────────────
// Pulled from PLAN.md Phase 1 table.

function stateDefault(overrides) {
  return {
    useCase: ['functional'],
    surface: 'standard',
    strength: 'standard',
    speed: 'balanced',
    environment: 'room_temp',
    support: 'none',
    colors: 'single',
    userLevel: 'intermediate',
    special: [],
    ...overrides,
  };
}

const COMBOS = [
  { id: 1, label: 'X1C + 0.4 std + PLA Basic + Standard/Balanced (baseline sanity)',
    state: stateDefault({ printer: 'x1c', nozzle: 'std_0.4', material: 'pla_basic' }) },

  { id: 2, label: 'X1C + 0.2 precision + TPU 95A + Fine/Quality (small nozzle + flex)',
    state: stateDefault({ printer: 'x1c', nozzle: 'prc_0.2', material: 'tpu_95a', surface: 'fine', speed: 'quality' }) },

  { id: 3, label: 'X1C + 0.8 std + PLA Basic + Draft/Fast (big nozzle + max throughput)',
    state: stateDefault({ printer: 'x1c', nozzle: 'std_0.8', material: 'pla_basic', surface: 'draft', speed: 'fast' }) },

  { id: 4, label: 'P1S + 0.6 hardened + PLA-CF + Strong/Balanced (abrasive + strength)',
    state: stateDefault({ printer: 'p1s', nozzle: 'hrd_0.6', material: 'pla_cf', strength: 'strong' }) },

  { id: 5, label: 'A1 mini + 0.4 std + PETG Basic + Standard/Balanced (bedslinger, A1 mini bed-temp q)',
    state: stateDefault({ printer: 'a1mini', nozzle: 'std_0.4', material: 'petg_basic' }) },

  { id: 6, label: 'A1 + 0.4 std + ABS + Standard/Balanced (bedslinger open-frame + high-temp)',
    state: stateDefault({ printer: 'a1', nozzle: 'std_0.4', material: 'abs' }) },

  { id: 7, label: 'Prusa MK4 + 0.4 std + PLA Silk + Fine/Quality (Prusa slicer path)',
    state: stateDefault({ printer: 'mk4', nozzle: 'std_0.4', material: 'pla_silk', surface: 'fine', speed: 'quality' }) },

  { id: 8, label: 'Prusa MK4S + 0.4 std + PETG HF + Standard/Fast (Prusa + HF)',
    state: stateDefault({ printer: 'mk4s', nozzle: 'std_0.4', material: 'petg_hf', speed: 'fast' }) },

  { id: 9, label: 'Voron 2.4 + 0.4 hardened + PA-CF + Maximum/Balanced (CoreXY + abrasive + hot)',
    state: stateDefault({ printer: 'voron_2_4', nozzle: 'hrd_0.4', material: 'pa_cf', surface: 'maximum' }) },

  { id: 10, label: 'K1 Max + 0.4 std + PC + Strong/Balanced (K1+PC bed-temp gap check)',
    state: stateDefault({ printer: 'k1_max', nozzle: 'std_0.4', material: 'pc', strength: 'strong' }) },
];

// ─── Main ───────────────────────────────────────────────────────────────────

(async () => {
  try {
    await Engine.init();
  } catch (e) {
    console.error('Engine.init() failed:', e);
    process.exit(1);
  }

  let report = '';
  report += h1('Domain walkthrough — 10 combos');
  report += `_Generated by \`scripts/walkthrough-harness.js\`. Engine SHA256: ${crypto_sha256(path.join(ROOT, 'engine.js'))}._\n\n`;
  report += '_Date: 2026-04-20. Reviewed commits: web `c4c5071`, iOS `24aef66`._\n\n';
  report += 'This report runs the live engine for 10 representative printer × nozzle × material × goals combinations. Each combo shows the emitted profile, any warnings fired, the generated chip descriptions, and the results of a set of automated structural checks (clamp-to-printer-caps, retraction scaling, warning-fires-when-expected, IMPL-040 parity).\n\n';
  report += 'Items flagged ❌ or ⚠ are either bugs or noteworthy drift; items flagged ℹ are context.\n\n';

  // Also resolve each combo and collect summary
  const results = COMBOS.map(runCombo);

  // Summary table
  report += h2('Summary');
  report += '| # | Combo | Warnings | Automated checks (fail/warn) |\n|---|---|---|---|\n';
  for (const r of results) {
    const checks = automatedChecks(r);
    const fails = checks.filter(c => c.severity === 'fail').length;
    const warns = checks.filter(c => c.severity === 'warn').length;
    const summary = fails > 0 ? `❌ ${fails} fail` : warns > 0 ? `⚠ ${warns} warn` : '✓ clean';
    report += `| ${r.combo.id} | ${r.combo.label} | ${r.warnings.length} | ${summary} |\n`;
  }
  report += '\n---\n\n';

  // Details per combo
  for (const r of results) {
    report += renderComboSection(r);
    report += '---\n\n';
  }

  process.stdout.write(report);
})();

function crypto_sha256(filePath) {
  const h = require('crypto').createHash('sha256');
  h.update(fs.readFileSync(filePath));
  return h.digest('hex').slice(0, 12);
}
