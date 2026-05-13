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
      if (k.startsWith('_')) continue;  // skip metadata keys (_prov sidecar)
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

  if (!printer) {
    checks.push({ severity: 'fail', label: 'unknown printer fixture', message: `state.printer="${combo.state.printer}" is not present in data/printers.json` });
  }
  if (!nozzle) {
    checks.push({ severity: 'fail', label: 'unknown nozzle fixture', message: `state.nozzle="${combo.state.nozzle}" is not present in data/nozzles.json` });
  }
  if (!mat) {
    checks.push({ severity: 'fail', label: 'unknown material fixture', message: `state.material="${combo.state.material}" is not present in data/materials.json` });
  }

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

  // 0c. [IMPL-041 / DQ-1] Provenance coverage — every numeric or numeric-derived
  //     emission must carry a non-null `prov` tag so pros can audit the numbers
  //     we emit. String-only qualitative emissions (pattern names, generator
  //     type, seam position) are exempt — no digit, no claim to audit.
  //
  //     Shape: prov === null  → qualitative, exempt
  //            prov === { source: 'vendor'|'rule'|'default'|'calculated', ref? }
  //                             → tagged, valid
  //
  //     This check lands in DQ-1 commit 2 and FAILS initially by design. DQ-1
  //     commit 3 fills baseline tags on every numeric emission in resolveProfile
  //     to satisfy it. Once green, it prevents future untagged emissions from
  //     slipping through review.
  const _hasDigit = (v) => v != null && /\d/.test(String(v));
  const _isNumericEmission = (entry) => {
    if (!entry || entry.value == null) return false;
    return typeof entry.value === 'number' || _hasDigit(entry.value);
  };
  const _validProvShape = (p) => {
    if (p == null) return true; // null is explicitly allowed for qualitative fields
    if (typeof p !== 'object') return false;
    const okSources = ['vendor', 'rule', 'default', 'calculated'];
    return okSources.includes(p.source);
  };
  const _untagged = Object.entries(profile).filter(([, v]) => _isNumericEmission(v) && v.prov == null);
  if (_untagged.length > 0) {
    checks.push({
      severity: 'fail',
      label: 'numeric emissions missing provenance (DQ-1)',
      message: `${_untagged.length} numeric field(s) without prov tag: ${_untagged.map(([k]) => k).join(', ')}`
    });
  }
  const _malformed = Object.entries(profile).filter(([, v]) => v && v.prov != null && !_validProvShape(v.prov));
  if (_malformed.length > 0) {
    checks.push({
      severity: 'fail',
      label: 'malformed prov on profile emissions (DQ-1)',
      message: `${_malformed.length} field(s) with invalid prov shape: ${_malformed.map(([k]) => k).join(', ')} — expected { source: 'vendor'|'rule'|'default'|'calculated', ref? }`
    });
  }

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

  { id: 11, label: 'Creality i7 / SPARKX + 0.4 hardened + PLA-CF + Standard/Balanced (new open-frame bedslinger)',
    state: stateDefault({ printer: 'sparkx_i7', nozzle: 'hrd_0.4', material: 'pla_cf' }) },
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
  report += h1(`Domain walkthrough — ${COMBOS.length} combos`);
  report += `_Generated by \`scripts/walkthrough-harness.js\`. Engine SHA256: ${crypto_sha256(path.join(ROOT, 'engine.js'))}._\n\n`;
  report += '_Date: 2026-04-20. Reviewed commits: web `c4c5071`, iOS `24aef66`._\n\n';
  report += `This report runs the live engine for ${COMBOS.length} representative printer × nozzle × material × goals combinations. Each combo shows the emitted profile, any warnings fired, the generated chip descriptions, and the results of a set of automated structural checks (clamp-to-printer-caps, retraction scaling, warning-fires-when-expected, IMPL-040 parity).\n\n`;
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

  // ─── v1.0.4 — Strength speed_multiplier wired in (HIGH-09 / HIGH-04) ──────
  {
    function pickSpeed(state, fieldKey) {
      Engine.setActiveSlicer(Engine.getSlicerForPrinter(state.printer));
      const profile = Engine.resolveProfile(state);
      const value = profile?.[fieldKey]?.value;
      if (typeof value !== 'string') throw new Error(`missing ${fieldKey} in profile`);
      return parseFloat(value);
    }
    const base = { printer: 'x1c', nozzle: 'std_0.4', material: 'pla_basic',
                   useCase: ['functional'], surface: 'standard', speed: 'balanced',
                   environment: 'normal', support: 'none', colors: 'single',
                   userLevel: 'intermediate', special: [], build_plate: 'textured_pei',
                   profileMode: 'safe' };
    const std = pickSpeed({ ...base, strength: 'standard' }, 'outer_wall_speed');
    const strong = pickSpeed({ ...base, strength: 'strong' }, 'outer_wall_speed');
    const max = pickSpeed({ ...base, strength: 'maximum' }, 'outer_wall_speed');
    if (std !== 100) throw new Error(`v1.0.4 HIGH-09: expected std outer=100 on X1C+PLA+balanced, got ${std}`);
    if (strong !== 90) throw new Error(`v1.0.4 HIGH-09: expected strong outer=90 (100*0.9), got ${strong}`);
    if (max !== 80) throw new Error(`v1.0.4 HIGH-09: expected maximum outer=80 (100*0.8), got ${max}`);
    if (!(strong < std)) throw new Error(`v1.0.4 HIGH-09: strong outer (${strong}) should be < standard (${std}) on X1C+PLA+balanced`);
    if (!(max < strong)) throw new Error(`v1.0.4 HIGH-09: maximum outer (${max}) should be < strong (${strong}) on X1C+PLA+balanced`);
    const stdInner = pickSpeed({ ...base, strength: 'standard' }, 'inner_wall_speed');
    const strongInner = pickSpeed({ ...base, strength: 'strong' }, 'inner_wall_speed');
    if (!(strongInner < stdInner)) throw new Error(`v1.0.4 HIGH-09: strong inner (${strongInner}) should be < standard (${stdInner})`);
    console.log(`[v1.0.4 HIGH-09] OK strong<standard<inner on X1C+PLA+balanced: outer std=${std}, strong=${strong}, max=${max}`);
  }

  // ─── v1.0.4 — Env data layer + cold-warning fix (HIGH-07/08, HIGH-05) ─────
  {
    function profile(state) {
      Engine.setActiveSlicer(Engine.getSlicerForPrinter(state.printer));
      return Engine.resolveProfile(state);
    }
    function adv(state) {
      Engine.setActiveSlicer(Engine.getSlicerForPrinter(state.printer));
      return Engine.getAdvancedFilamentSettings(state);
    }
    function warnings(state) { return Engine.getWarnings(state).map(w => w.id); }
    const base = { printer: 'x1c', nozzle: 'std_0.4', material: 'pla_basic',
                   useCase: ['functional'], surface: 'standard', strength: 'standard',
                   speed: 'balanced', support: 'none', colors: 'single',
                   userLevel: 'intermediate', special: [], build_plate: 'textured_pei',
                   profileMode: 'safe' };

    // 1) bed_first_layer_adj wired into advanced filament settings (cold = +7°C bed first-layer)
    const advNormal = adv({ ...base, environment: 'normal' });
    const advCold = adv({ ...base, environment: 'cold' });
    const bedNormal = parseFloat(advNormal.bed_temperature_initial_layer.value);
    const bedCold = parseFloat(advCold.bed_temperature_initial_layer.value);
    if (!(bedCold > bedNormal)) throw new Error(`v1.0.4 HIGH-07: cold first-layer bed (${bedCold}) should exceed normal (${bedNormal}) by env.bed_first_layer_adj`);
    if (bedCold - bedNormal !== 7) throw new Error(`v1.0.4 HIGH-07: expected +7°C from env.cold.bed_first_layer_adj, got +${bedCold - bedNormal}`);

    // 2) fan_multiplier wired into cooling fan emission (cold = 0.9× of normal)
    const fanNormal = parseFloat(advNormal.fan_max_speed.value);
    const fanCold = parseFloat(advCold.fan_max_speed.value);
    if (!(fanCold < fanNormal)) throw new Error(`v1.0.4 HIGH-07: cold fan max (${fanCold}) should be lower than normal (${fanNormal}) by env.fan_multiplier`);
    if (Math.round(fanCold) !== Math.round(fanNormal * 0.9)) throw new Error(`v1.0.4 HIGH-07: expected fanCold = round(fanNormal * 0.9) = ${Math.round(fanNormal * 0.9)}, got ${fanCold} (fanNormal=${fanNormal})`);

    // 3) force_draft_shield wired into profile output for cold/vcold env
    const profCold = profile({ ...base, environment: 'cold' });
    const draftShieldField = profCold.draft_shield;
    if (!draftShieldField || !/enabled|on|true/i.test(String(draftShieldField.value))) {
      throw new Error(`v1.0.4 HIGH-08: cold env should emit draft_shield enabled; got ${JSON.stringify(draftShieldField)}`);
    }

    // 4) Cold-warning text does NOT lie. If warning copy mentions "first layer bed +N", N must match emitted delta.
    const coldWarnings = Engine.getWarnings({ ...base, environment: 'cold' });
    const bedClaim = coldWarnings.find(w => /first[\s-]?layer\s+bed/i.test(w.text + ' ' + (w.detail || '')));
    if (bedClaim) {
      const match = (bedClaim.text + ' ' + (bedClaim.detail || '')).match(/\+\s*(\d+)\s*°?C/i);
      const claimed = match ? parseInt(match[1], 10) : null;
      const delta = Math.round(bedCold - bedNormal);
      if (claimed !== null && claimed !== delta) {
        throw new Error(`v1.0.4 HIGH-05: cold warning claims +${claimed}°C first-layer bed but emit is +${delta}°C`);
      }
    }
    console.log(`[v1.0.4 ENV] OK bed_first_layer_adj=+${Math.round(bedCold - bedNormal)}°C, fan reduced, draft_shield emitted, warning copy matches emit`);
  }

  // ─── v1.0.4 — env clamp misattribution (MEDIUM-05) ────────────────────────
  {
    // PLA Basic on A1 + vcold (PLA max_nozzle=230). Env wants +10°C → 230 + initial offset
    // would clamp. Warning should attribute to env, not material.
    const stVcold = { printer: 'a1', nozzle: 'std_0.4', material: 'pla_basic',
                      useCase: ['functional'], surface: 'standard', strength: 'standard',
                      speed: 'balanced', environment: 'vcold', support: 'none', colors: 'single',
                      userLevel: 'intermediate', special: [], build_plate: 'textured_pei',
                      profileMode: 'safe' };
    const ws = Engine.getWarnings(stVcold);
    const envClampWarn = ws.find(w => /env_compensation_capped|env.*clamp|cold.*clamp/i.test(w.id || ''));
    if (!envClampWarn) {
      throw new Error(`v1.0.4 MEDIUM-05: expected env-attributed clamp warning on PLA+a1+vcold; got ids ${ws.map(w => w.id).join(',')}`);
    }
    console.log(`[v1.0.4 MEDIUM-05] OK env-attributed clamp warning id=${envClampWarn.id}`);
  }

  // ─── v1.0.4 — Physical printer × nozzle guard (HIGH-01) ───────────────────
  {
    // Ender-3 V3 SE has available_nozzle_sizes:[0.4]. Selecting std_0.8 must warn.
    const stBad = { printer: 'ender3_v3_se', nozzle: 'std_0.8', material: 'pla_basic',
                    useCase: ['functional'], surface: 'standard', strength: 'standard',
                    speed: 'balanced', environment: 'normal', support: 'none', colors: 'single',
                    userLevel: 'intermediate', special: [], build_plate: 'textured_pei',
                    profileMode: 'safe' };
    const warnIds = Engine.getWarnings(stBad).map(w => w.id);
    const has = warnIds.includes('nozzle_not_on_printer');
    if (!has) throw new Error(`v1.0.4 HIGH-01: expected nozzle-not-available warning on ender3_v3_se+std_0.8; got ${warnIds.join(',')}`);

    // Centauri Carbon has available_nozzle_sizes:[0.4]. std_0.4 must NOT warn for this reason.
    const stOk = { ...stBad, printer: 'centauri_carbon', nozzle: 'std_0.4' };
    const okWarnIds = Engine.getWarnings(stOk).map(w => w.id);
    if (okWarnIds.includes('nozzle_not_on_printer')) {
      throw new Error(`v1.0.4 HIGH-01: centauri_carbon+std_0.4 should NOT trigger nozzle-not-on-printer; got ${okWarnIds.join(',')}`);
    }

    // Bambu X1C has available_nozzle_sizes:[0.2, 0.4, 0.6, 0.8]. std_0.6 must NOT trigger guard.
    const stMulti = { ...stBad, printer: 'x1c', nozzle: 'std_0.6' };
    const multiWarnIds = Engine.getWarnings(stMulti).map(w => w.id);
    if (multiWarnIds.includes('nozzle_not_on_printer')) {
      throw new Error(`v1.0.4 HIGH-01: x1c+std_0.6 should NOT trigger nozzle-not-on-printer; got ${multiWarnIds.join(',')}`);
    }

    // getCompatibleNozzlesForPrinter is a hard contract on the public surface; if
    // it's silently dropped the harness must fail rather than skip the check.
    if (typeof Engine.getCompatibleNozzlesForPrinter !== 'function') {
      throw new Error(`v1.0.4 HIGH-01: Engine.getCompatibleNozzlesForPrinter must be exposed on the public surface`);
    }
    const list = Engine.getCompatibleNozzlesForPrinter('pla_basic', 'ender3_v3_se');
    const std08 = list.find(e => e.id === 'std_0.8');
    if (std08 && std08.compatible === true) {
      throw new Error(`v1.0.4 HIGH-01: getCompatibleNozzlesForPrinter should mark std_0.8 incompatible on ender3_v3_se`);
    }
    const std04 = list.find(e => e.id === 'std_0.4');
    if (std04 && std04.compatible !== true) {
      throw new Error(`v1.0.4 HIGH-01: getCompatibleNozzlesForPrinter should keep std_0.4 compatible on ender3_v3_se`);
    }

    console.log(`[v1.0.4 HIGH-01] OK printer × nozzle guard fires for ender3_v3_se+std_0.8 and stays silent for centauri_carbon+std_0.4`);
  }

  // ─── v1.0.4 — Physical printer × plate guard + material plate range (HIGH-02 / HIGH-03) ─
  {
    const baseHarness = { nozzle: 'std_0.4', useCase: ['functional'], surface: 'standard',
                          strength: 'standard', speed: 'balanced', environment: 'normal',
                          support: 'none', colors: 'single', userLevel: 'intermediate',
                          special: [], profileMode: 'safe' };

    // 1) BAD: H2D ships [textured_pei, smooth_pei] — cool_plate is not on the printer.
    //    Selecting it must warn with exact ID 'plate_not_on_printer'.
    const stBad = { ...baseHarness, printer: 'h2d', material: 'pla_basic', build_plate: 'cool_plate' };
    const badIds = Engine.getWarnings(stBad).map(w => w.id);
    if (!badIds.includes('plate_not_on_printer')) {
      throw new Error(`v1.0.4 HIGH-02: expected exact warning id 'plate_not_on_printer' on h2d+cool_plate; got ${badIds.join(',')}`);
    }

    // 2) GOOD: Centauri Carbon has available_plates:[textured_pei]. Must NOT trigger guard.
    const stOk = { ...baseHarness, printer: 'centauri_carbon', material: 'pla_basic', build_plate: 'textured_pei' };
    const okIds = Engine.getWarnings(stOk).map(w => w.id);
    if (okIds.includes('plate_not_on_printer')) {
      throw new Error(`v1.0.4 HIGH-02: centauri_carbon+textured_pei should NOT trigger plate_not_on_printer; got ${okIds.join(',')}`);
    }

    // 3) MULTI-PLATE GOOD: x1c ships multiple plates incl. textured_pei. Must NOT trigger guard.
    const stMulti = { ...baseHarness, printer: 'x1c', material: 'pla_basic', build_plate: 'textured_pei' };
    const multiIds = Engine.getWarnings(stMulti).map(w => w.id);
    if (multiIds.includes('plate_not_on_printer')) {
      throw new Error(`v1.0.4 HIGH-02: x1c+textured_pei should NOT trigger plate_not_on_printer (multi-plate printer); got ${multiIds.join(',')}`);
    }

    // 4) HIGH-03 POSITIVE: petg_basic on textured_pei (x1c) — recipe yields
    //    initBed=85 (75 base + 0 env + 5 init-offset + 5 PETG bump), other=75;
    //    plate range for petg_basic on textured_pei is [60, 80]. 85 > 80 ⇒ MUST
    //    fire plate_bed_temp_range. Exercises the initial-layer-driven path
    //    where steady-state stays in-range but the initial layer exceeds it.
    const stBedRange = { ...baseHarness, printer: 'x1c', material: 'petg_basic', build_plate: 'textured_pei' };
    const bedRangeIds = Engine.getWarnings(stBedRange).map(w => w.id);
    if (!bedRangeIds.includes('plate_bed_temp_range')) {
      throw new Error(`v1.0.4 HIGH-03: expected exact warning id 'plate_bed_temp_range' on x1c+petg_basic+textured_pei (initBed 85°C exceeds plate max 80°C); got ${bedRangeIds.join(',')}`);
    }

    // 5) HIGH-03 NEGATIVE: pla_basic on textured_pei (x1c) — both targets fall
    //    inside the plate's [55, 65]°C range. Must NOT fire plate_bed_temp_range.
    const stBedRangeOk = { ...baseHarness, printer: 'x1c', material: 'pla_basic', build_plate: 'textured_pei' };
    const bedRangeOkIds = Engine.getWarnings(stBedRangeOk).map(w => w.id);
    if (bedRangeOkIds.includes('plate_bed_temp_range')) {
      throw new Error(`v1.0.4 HIGH-03: x1c+pla_basic+textured_pei should NOT trigger plate_bed_temp_range (both bed targets in [55,65]); got ${bedRangeOkIds.join(',')}`);
    }

    console.log(`[v1.0.4 HIGH-02/HIGH-03] OK plate guard fires for h2d+cool_plate, stays silent for centauri_carbon+textured_pei and x1c+textured_pei; plate_bed_temp_range fires for petg_basic+textured_pei and stays silent for pla_basic+textured_pei`);
  }

  // ─── v1.0.4 — Practical MCS tiers (HIGH-03 system-type, HIGH ams_lite, MEDIUM-01 empty-MCS) ─
  {
    function getProfile(state) {
      Engine.setActiveSlicer(Engine.getSlicerForPrinter(state.printer));
      return Engine.resolveProfile(state);
    }
    function wIds(state) { return Engine.getWarnings(state).map(w => w.id); }
    const baseMCS = { nozzle: 'std_0.4', useCase: ['functional'], surface: 'standard',
                      strength: 'standard', speed: 'balanced', environment: 'normal',
                      support: 'none', userLevel: 'intermediate', special: [],
                      build_plate: 'textured_pei', profileMode: 'safe' };

    // 1) EMPTY MCS: centauri_carbon (multi_color_systems:[]) + multi_2_4 must warn AND must NOT emit prime_tower: Enabled.
    const stEmpty = { ...baseMCS, printer: 'centauri_carbon', material: 'pla_basic', colors: 'multi_2_4' };
    const profEmpty = getProfile(stEmpty);
    const emptyIds = wIds(stEmpty);
    if (!emptyIds.includes('mcs_empty_no_multicolor')) {
      throw new Error(`v1.0.4 MEDIUM-01: empty-MCS centauri_carbon+multi_2_4 must fire 'mcs_empty_no_multicolor'; got ${emptyIds.join(',')}`);
    }
    if (profEmpty.prime_tower && /enabled/i.test(String(profEmpty.prime_tower.value || ''))) {
      throw new Error(`v1.0.4 MEDIUM-01: empty-MCS must NOT emit prime_tower=Enabled; got ${profEmpty.prime_tower.value}`);
    }

    // 2) AMS LITE MATERIAL GATE: A1 (ams_lite) + ABS (ams_compatible:true but ams_lite_compatible:false) + multi MUST warn 'ams_lite_material_incompat'.
    const stLite = { ...baseMCS, printer: 'a1', material: 'abs', colors: 'multi_2_4' };
    const liteIds = wIds(stLite);
    if (!liteIds.includes('ams_lite_material_incompat')) {
      throw new Error(`v1.0.4 (ams_lite): A1+ABS+multi must fire 'ams_lite_material_incompat'; got ${liteIds.join(',')}`);
    }

    // 3) AMS LITE COMPATIBLE: A1 + PLA Basic (ams_lite_compatible likely true) + multi MUST NOT fire ams_lite_material_incompat.
    const stLiteOK = { ...baseMCS, printer: 'a1', material: 'pla_basic', colors: 'multi_2_4' };
    const liteOKIds = wIds(stLiteOK);
    if (liteOKIds.includes('ams_lite_material_incompat')) {
      throw new Error(`v1.0.4 (ams_lite): A1+PLA Basic+multi must NOT fire 'ams_lite_material_incompat'; got ${liteOKIds.join(',')}`);
    }

    // 4) AMS-LIKE (x1c, ams_compatible PLA Basic) — no false ams_lite warning, no empty-MCS warning.
    const stAMS = { ...baseMCS, printer: 'x1c', material: 'pla_basic', colors: 'multi_2_4' };
    const amsIds = wIds(stAMS);
    if (amsIds.includes('ams_lite_material_incompat')) {
      throw new Error(`v1.0.4 (system-type): x1c (ams_like) must NOT fire ams_lite-specific warning; got ${amsIds.join(',')}`);
    }
    if (amsIds.includes('mcs_empty_no_multicolor')) {
      throw new Error(`v1.0.4 (system-type): x1c (ams_like) must NOT fire empty-MCS warning; got ${amsIds.join(',')}`);
    }

    // 5) CFS tier (k2_plus): k2_plus + pla_basic + multi MUST fire 'mcs_tier_cfs_guidance'.
    const stCFS = { ...baseMCS, printer: 'k2_plus', material: 'pla_basic', colors: 'multi_2_4' };
    const cfsIds = wIds(stCFS);
    if (!cfsIds.includes('mcs_tier_cfs_guidance')) {
      throw new Error(`v1.0.4 (cfs tier): k2_plus+pla+multi must fire 'mcs_tier_cfs_guidance'; got ${cfsIds.join(',')}`);
    }

    // 6) CFS LITE sysLabel branch (sparkx_i7): sparkx_i7 + pla_basic + multi MUST also fire 'mcs_tier_cfs_guidance'
    // (exercises the cfs_lite branch in the sysLabel ternary — same ID, different printer/system label).
    const stCFSLite = { ...baseMCS, printer: 'sparkx_i7', material: 'pla_basic', colors: 'multi_2_4' };
    const cfsLiteIds = wIds(stCFSLite);
    if (!cfsLiteIds.includes('mcs_tier_cfs_guidance')) {
      throw new Error(`v1.0.4 (cfs_lite tier): sparkx_i7+pla+multi must fire 'mcs_tier_cfs_guidance'; got ${cfsLiteIds.join(',')}`);
    }

    // 7) GENERIC NON-AMS tier (mk4 with mmu3): must fire 'mcs_tier_generic_non_ams_guidance'.
    const stGeneric = { ...baseMCS, printer: 'mk4', material: 'pla_basic', colors: 'multi_2_4' };
    const genericIds = wIds(stGeneric);
    if (!genericIds.includes('mcs_tier_generic_non_ams_guidance')) {
      throw new Error(`v1.0.4 (generic_non_ams tier): mk4+pla+multi must fire 'mcs_tier_generic_non_ams_guidance'; got ${genericIds.join(',')}`);
    }

    // 8) AMS-LIKE prime_tower PRESERVED: x1c + multi MUST still emit prime_tower=Enabled (positive case — pairs with assertion 1's negative).
    const profAMS = getProfile({ ...baseMCS, printer: 'x1c', material: 'pla_basic', colors: 'multi_2_4' });
    if (!profAMS.prime_tower || !/enabled/i.test(String(profAMS.prime_tower.value || ''))) {
      throw new Error(`v1.0.4 (ams_like): x1c+multi MUST emit prime_tower=Enabled; got ${profAMS.prime_tower?.value || '(absent)'}`);
    }

    // 9) MULTI_5 empty-MCS suppression: centauri_carbon + multi_5 must suppress BOTH prime_tower AND flush_into_infill
    //    (exercises the multi_5 branch in the gating).
    const profEmpty5 = getProfile({ ...baseMCS, printer: 'centauri_carbon', material: 'pla_basic', colors: 'multi_5' });
    if (profEmpty5.prime_tower && /enabled/i.test(String(profEmpty5.prime_tower.value || ''))) {
      throw new Error(`v1.0.4 (multi_5 empty-MCS): centauri_carbon+multi_5 must NOT emit prime_tower=Enabled; got ${profEmpty5.prime_tower.value}`);
    }
    if (profEmpty5.flush_into_infill && /enabled/i.test(String(profEmpty5.flush_into_infill.value || ''))) {
      throw new Error(`v1.0.4 (multi_5 empty-MCS): centauri_carbon+multi_5 must NOT emit flush_into_infill=Enabled; got ${profEmpty5.flush_into_infill.value}`);
    }

    console.log(`[v1.0.4 MCS] OK empty-MCS warn+suppress; ams_lite gates; ams_like preserves prime_tower; cfs/cfs_lite/generic_non_ams advisories fire; multi_5 suppression on empty-MCS works. empty prime_tower=${profEmpty.prime_tower?.value || '(absent)'}, ams_like prime_tower=${profAMS.prime_tower?.value}, cfs ids=${cfsIds.length}, generic ids=${genericIds.length}`);
  }

  // ─── v1.0.4 — Chamber safe-cap guard (HIGH-05) ─────────────────────────────
  // Owner default 4: guard-only. No numeric chamber profile field is emitted;
  // the guard surfaces a warning whenever the active-chamber printer + material
  // pair could exceed the material's safe ceiling.
  //
  // Canonical pathological combo: X1E (active_chamber_heating, max_chamber=60°C)
  // + PETG Basic (safe_chamber_temp_max=50°C) — guard MUST fire.
  // Silent-for cases:
  //   - X1C + PETG Basic: enclosed but no active_chamber_heating → guard MUST NOT fire.
  //   - X1E + PLA Basic: active chamber but PLA carries no safe_chamber_temp_max → guard MUST NOT fire.
  {
    const stFire = stateDefault({
      printer: 'x1e', nozzle: 'std_0.4', material: 'petg_basic',
    });
    const fireWarns = Engine.getWarnings(stFire);
    const fireIds = fireWarns.map(w => w.id);
    if (!fireIds.includes('chamber_above_material_safe')) {
      throw new Error(`v1.0.4 HIGH-05: X1E+petg_basic must fire chamber_above_material_safe; got ${fireIds.join(',')}`);
    }
    const petg = Engine.getMaterial('petg_basic');
    const matCap = petg?.safe_chamber_temp_max ?? petg?.enclosure_behavior?.safe_chamber_temp_max;
    if (matCap !== 50) {
      throw new Error(`v1.0.4 HIGH-05: petg_basic safe_chamber_temp_max expected 50, got ${matCap}`);
    }
    const guardWarn = fireWarns.find(w => w.id === 'chamber_above_material_safe');
    if (!/50°C/.test(guardWarn.text)) {
      throw new Error(`v1.0.4 HIGH-05: guard text must reference 50°C cap; got "${guardWarn.text}"`);
    }

    const stSilentNoActive = stateDefault({
      printer: 'x1c', nozzle: 'std_0.4', material: 'petg_basic',
    });
    const silentNoActiveIds = Engine.getWarnings(stSilentNoActive).map(w => w.id);
    if (silentNoActiveIds.includes('chamber_above_material_safe')) {
      throw new Error(`v1.0.4 HIGH-05: X1C+petg_basic (no active chamber) must NOT fire chamber_above_material_safe; got ${silentNoActiveIds.join(',')}`);
    }

    const stSilentNoCap = stateDefault({
      printer: 'x1e', nozzle: 'std_0.4', material: 'pla_basic',
    });
    const silentNoCapIds = Engine.getWarnings(stSilentNoCap).map(w => w.id);
    if (silentNoCapIds.includes('chamber_above_material_safe')) {
      throw new Error(`v1.0.4 HIGH-05: X1E+pla_basic (material has no safe cap) must NOT fire chamber_above_material_safe; got ${silentNoCapIds.join(',')}`);
    }

    console.log(`[v1.0.4 HIGH-05] OK chamber_above_material_safe fires on X1E+petg_basic (cap=${matCap}°C); silent on X1C+petg_basic and X1E+pla_basic.`);
  }

  // [IMPL-041 / DQ-2] Cross-combo Safe/Tuned assertion. Runs two baseline
  // combos in Safe and Tuned; asserts:
  //   (a) Safe emission byte-equal to the default (profileMode absent) combo
  //       — protects the "zero-surprise for existing users" invariant.
  //   (b) Tuned emission differs from Safe on at least 3 of the 5 MVP tiered
  //       fields for an A1+strong+fast combo (sized for Bedslinger coverage),
  //       proving the _tuned data actually flows through _tier() + _clampNum.
  report += h2('DQ-2 Safe vs Tuned assertion');
  const dq2Lines = [];
  const dq2Fields = ['outer_wall_speed', 'outer_wall_acceleration', 'sparse_infill_density'];

  const baseSafe = Engine.resolveProfile(stateDefault({
    printer: 'a1', nozzle: 'std_0.4', material: 'pla_basic',
    strength: 'strong', speed: 'fast',
  }));
  const explicitSafe = Engine.resolveProfile(stateDefault({
    printer: 'a1', nozzle: 'std_0.4', material: 'pla_basic',
    strength: 'strong', speed: 'fast', profileMode: 'safe',
  }));
  const tuned = Engine.resolveProfile(stateDefault({
    printer: 'a1', nozzle: 'std_0.4', material: 'pla_basic',
    strength: 'strong', speed: 'fast', profileMode: 'tuned',
  }));

  // (a) Safe-default byte-equality check — absent profileMode vs explicit 'safe'
  const byteEqual = dq2Fields.every(k => baseSafe[k]?.value === explicitSafe[k]?.value);
  dq2Lines.push(`- ${byteEqual ? '✓' : '❌'} Safe baseline: profileMode absent === profileMode='safe' on ${dq2Fields.length} tiered fields.`);

  // (b) Tuned delta — count how many tiered fields differ from Safe
  const differentiated = dq2Fields.filter(k => baseSafe[k]?.value !== tuned[k]?.value);
  const diffSummary = differentiated.map(k => `${k}: ${baseSafe[k]?.value} → ${tuned[k]?.value}`).join(', ');
  dq2Lines.push(`- ${differentiated.length >= 3 ? '✓' : '❌'} Tuned differentiation: ${differentiated.length}/5 tiered fields differ on A1+strong+fast (${diffSummary || 'none'}).`);

  // (c) Prov tier markers — tuned run should carry " (_tuned)" or " (base from _tuned)" in prov.ref for at least the differentiated fields
  const provTagged = differentiated.filter(k => typeof tuned[k]?.prov?.ref === 'string' && /_tuned/.test(tuned[k].prov.ref));
  dq2Lines.push(`- ${provTagged.length === differentiated.length ? '✓' : '⚠'} Prov refs tier-tagged: ${provTagged.length}/${differentiated.length} differentiated fields carry '_tuned' marker.`);

  report += dq2Lines.join('\n') + '\n\n---\n\n';

  process.stdout.write(report);
})();

function crypto_sha256(filePath) {
  const h = require('crypto').createHash('sha256');
  h.update(fs.readFileSync(filePath));
  return h.digest('hex').slice(0, 12);
}
