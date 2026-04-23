// ─── 3D Print Assistant — Engine ─────────────────────────────────────────────
// All business logic lives here. app.js is UI only.
// Data is loaded from /data/*.json — identical pattern to future API calls.
// To migrate to API: replace fetch('./data/...') with fetch('https://api.../...')

const Engine = (() => {
  // ── Private data store (populated by init()) ────────────────────────────────
  let _printers      = [];
  let _brands        = [];
  let _materials     = [];
  let _nozzles       = [];
  let _envRules      = [];
  let _objectives    = {};
  let _warnings      = {};
  let _troubleshooter = {};
  let _slicerCaps    = null;  // loaded from data/rules/slicer_capabilities.json

  // ── Language system ───────────────────────────────────────────────────────────
  let _lang = 'en'; // 'en' | 'da'

  // Populated by init() from locales/*.json — do not add strings here
  let _T = { en: {}, da: {} };

  // t(key) — returns current-language string, falls back to EN, then key name
  function t(key) {
    return (_T[_lang]?.[key]) ?? (_T.en?.[key]) ?? key;
  }
  function setLang(lang) {
    if (!_T[lang]) return;
    _lang = lang;
    try { localStorage.setItem('3dpa_lang', lang); } catch (_) {}
  }
  function getLang() { return _lang; }

  // ── Mode helpers — tag each profile param with simple/advanced ──────────────
  const S = (value, why = '') => ({ value, why, mode: 'simple' });
  const A = (value, why = '') => ({ value, why, mode: 'advanced' });

  // ── Init — load all JSON data files + locale files ──────────────────────────
  async function init() {
    // Restore persisted language preference (keys are always 'en'/'da')
    try { const stored = localStorage.getItem('3dpa_lang'); if (stored && _T[stored] !== undefined) _lang = stored; } catch (_) {}

    const base = './data/';
    const [printersRes, materialsRes, nozzlesRes, envRes, objRes, warnRes, tsRes, scRes, locEnRes, locDaRes] =
      await Promise.all([
        fetch(base + 'printers.json'),
        fetch(base + 'materials.json'),
        fetch(base + 'nozzles.json'),
        fetch(base + 'rules/environment.json'),
        fetch(base + 'rules/objective_profiles.json'),
        fetch(base + 'rules/warnings.json'),
        fetch(base + 'rules/troubleshooter.json'),
        fetch(base + 'rules/slicer_capabilities.json'),
        fetch('./locales/en.json'),
        fetch('./locales/da.json'),
      ]);

    // [LOW-008] Per-file parse strategy. Critical files (printers, materials,
    // nozzles, environment, objective_profiles, warnings, en locale, da locale)
    // hard-fail — engine output is nonsensical without them. Non-critical files
    // (troubleshooter, slicer_capabilities) fall back to documented defaults so
    // a single malformed JSON doesn't brick the whole engine; the consequences
    // are surfaced as warnings so dev builds notice:
    //   • troubleshooter → { symptoms: [] } (empty troubleshooter UI)
    //   • slicer_capabilities → null (mapForSlicer fails open per OBS-007)
    const _critical = async (res) => {
      if (!res.ok) throw new Error(`Failed to load ${res.url} (HTTP ${res.status})`);
      return res.json();
    };
    const _soft = async (res, defaultValue, label) => {
      if (!res.ok) {
        console.warn(`[Engine init] Failed to load ${res.url} (HTTP ${res.status}) — using ${label} default`);
        return defaultValue;
      }
      try {
        return await res.json();
      } catch (e) {
        console.warn(`[Engine init] Failed to parse ${res.url}: ${e?.message || e} — using ${label} default`);
        return defaultValue;
      }
    };

    const [pd, md, nd, ed, od, wd, td, scd, enLocale, daLocale] = await Promise.all([
      _critical(printersRes),
      _critical(materialsRes),
      _critical(nozzlesRes),
      _critical(envRes),
      _critical(objRes),
      _critical(warnRes),
      _soft(tsRes, { symptoms: [] },        'troubleshooter'),
      _soft(scRes, null,                    'slicer_capabilities'),
      _critical(locEnRes),
      _critical(locDaRes),
    ]);

    _printers       = pd.printers;
    _brands         = pd.brands || [];
    _materials      = md.materials;
    _nozzles        = nd.nozzles;
    _envRules       = ed.environment_options;
    _objectives     = od;
    _warnings       = wd;
    _troubleshooter = td;
    _slicerCaps     = scd;
    _T.en           = enLocale;
    _T.da           = daLocale;

    _validateSchema();
  }

  // [R8] Schema validation. Runs after data loads — catches the data-integrity
  // gaps that MEDIUM-001, MEDIUM-007, MEDIUM-018, MEDIUM-019 and HIGH-009 were
  // symptoms of. Two tiers:
  //
  //   • Critical violations (unknown printer.series, non-numeric
  //     limits_override.nozzles key, missing required material fields) —
  //     throw, preventing a half-initialised engine from serving bad profiles.
  //   • Soft violations (max_mvs key gaps, unknown not_suitable_for refs) —
  //     console.warn so dev builds notice while production keeps serving.
  //
  // Soft-vs-critical classification reflects "does this silently change
  // emission for real users". Subsumes the MEDIUM-007 inline check.
  let _schemaValidated = false;
  function _validateSchema() {
    if (_schemaValidated) return;
    _schemaValidated = true;
    const errors = [];
    const warnings = [];

    // Critical: printer.series enum (MEDIUM-007)
    const VALID_PRINTER_SERIES = new Set(['corexy', 'bedslinger']);
    _printers.forEach(p => {
      if (!VALID_PRINTER_SERIES.has(p.series)) {
        errors.push(`printer "${p.id}" has invalid series="${p.series}" — expected corexy|bedslinger`);
      }
    });

    // Critical: limits_override.nozzles keys must be finite numbers (MEDIUM-001)
    _printers.forEach(p => {
      const override = p.limits_override;
      if (!override || !override.nozzles) return;
      Object.keys(override.nozzles).forEach(k => {
        if (!Number.isFinite(Number(k))) {
          errors.push(`printer "${p.id}" limits_override.nozzles has non-numeric key "${k}"`);
        }
      });
    });

    // Critical: every material has required base_settings fields
    _materials.forEach(m => {
      if (!m.id)   errors.push(`material missing id`);
      if (!m.name) errors.push(`material "${m.id}" missing name`);
      const bs = m.base_settings || {};
      ['nozzle_temp_base', 'bed_temp_base', 'retraction_distance'].forEach(f => {
        if (bs[f] == null) errors.push(`material "${m.id}" missing base_settings.${f}`);
      });
    });

    // Soft: nozzle.not_suitable_for refs (MEDIUM-018). Accept either a
    // material id or a case-insensitive material.group name.
    const materialIds = new Set(_materials.map(m => m.id));
    const materialGroups = new Set(_materials.map(m => m.group && m.group.toLowerCase()).filter(Boolean));
    _nozzles.forEach(n => {
      (n.not_suitable_for || []).forEach(ref => {
        if (!materialIds.has(ref) && !materialGroups.has(String(ref).toLowerCase())) {
          warnings.push(`nozzle "${n.id}" not_suitable_for references unknown material/group "${ref}"`);
        }
      });
    });

    // Soft: max_mvs / k_factor_matrix key alignment (MEDIUM-019 — partial fix)
    _materials.forEach(m => {
      const bs = m.base_settings || {};
      const mk = Object.keys(bs.max_mvs || {});
      const km = Object.keys(bs.k_factor_matrix || {});
      const missingInMax = km.filter(k => !mk.includes(k));
      if (missingInMax.length > 0) {
        warnings.push(`material "${m.id}" max_mvs missing keys present in k_factor_matrix: ${missingInMax.join(', ')}`);
      }
    });

    if (warnings.length > 0) {
      console.warn(`[Engine schema] ${warnings.length} soft warning(s):\n  • ${warnings.join('\n  • ')}`);
    }
    if (errors.length > 0) {
      throw new Error(`Engine schema validation failed:\n  • ${errors.join('\n  • ')}`);
    }
  }

  // ── Static UI filter arrays (pure UI concerns, not data-driven) ─────────────
  const _USE_CASES = [
    { id: 'prototype',  name: 'Prototype'           },
    { id: 'functional', name: 'Functional part'     },
    { id: 'decorative', name: 'Decorative'          },
    { id: 'miniature',  name: 'Miniature / details' },
    { id: 'large',      name: 'Large part'          },
  ];

  // [LOW-010] Single source of truth for support-type geometry.
  // Previously split across _SUPPORT_TYPES (id/name) + _SUPPORT_GEOMETRY
  // (type/z_gap) with a `|| '0.10'` silent fallback that would fire if a new
  // id ever got added to _SUPPORT_TYPES without geometry. Unified table means
  // a missing entry becomes `undefined.z_gap` → loud crash instead of silent
  // wrong-value emission. `none` intentionally has no geometry — it's gated
  // by `support.id !== 'none'` at every read site. IMPL-040.
  const _SUPPORT_TYPES = [
    { id: 'none',           name: 'None',           type: null,     z_gap: null  },
    { id: 'easy',           name: 'Easy removal',   type: 'Tree',   z_gap: '0.30' },
    { id: 'balanced',       name: 'Balanced',       type: 'Tree',   z_gap: '0.20' },
    { id: 'best_underside', name: 'Best underside', type: 'Normal', z_gap: '0.10' },
  ];

  const _COLOR_MODES = [
    { id: 'single',    name: 'Single color'   },
    { id: 'multi_2_4', name: 'Multicolor 2–4' },
    { id: 'multi_5',   name: 'Multicolor 5+'  },
  ];

  const _USER_LEVELS = [
    { id: 'beginner',     name: 'Beginner',     desc: 'Safe margins'   },
    { id: 'intermediate', name: 'Intermediate', desc: 'Standard'       },
    { id: 'advanced',     name: 'Advanced',     desc: 'Precise tuning' },
  ];

  const _SPECIAL_REQS = [
    { id: 'waterproof',   name: 'Waterproof'        },
    { id: 'high_temp',    name: 'High temp (>60°C)' },
    { id: 'metallic',     name: 'Metallic finish'   },
    { id: 'matte',        name: 'Matte finish'      },
    { id: 'glossy',       name: 'Glossy / Silk'     },
    { id: 'uv_resistant', name: 'UV-resistant'      },
  ];

  const _SEAM_OPTIONS = [
    { id: 'aligned',          name: 'Aligned'          },
    { id: 'sharpest_corner',  name: 'Sharpest corner'  },
    { id: 'random',           name: 'Random'           },
    { id: 'back',             name: 'Back'             },
  ];

  const _BRIM_OPTIONS = [
    { id: 'auto',       name: 'Auto'                        },
    { id: 'none',       name: 'None'                        },
    { id: 'small',      name: 'Small',  desc: '5 mm'       },
    { id: 'large',      name: 'Large',  desc: '10 mm'      },
    { id: 'mouse_ears', name: 'Mouse ears'                  },
  ];

  const _BUILD_PLATE_OPTIONS = [
    { id: 'smooth_pei',        name: 'Smooth PEI'        },
    { id: 'textured_pei',      name: 'Textured PEI'      },
    { id: 'cool_plate',        name: 'Cool Plate'        },
    { id: 'engineering_plate',  name: 'Engineering Plate' },
    { id: 'glass',             name: 'Glass'             },
    { id: 'garolite',          name: 'Garolite'          },
  ];

  const _EXTRUDER_TYPES = [
    { id: 'direct_drive', name: 'Direct drive' },
    { id: 'bowden',       name: 'Bowden'       },
  ];

  const _FILAMENT_CONDITIONS = [
    { id: 'freshly_dried',    name: 'Freshly dried'    },
    { id: 'opened_recently',  name: 'Opened recently'  },
    { id: 'unknown',          name: 'Unknown'          },
  ];

  const _IRONING_OPTIONS = [
    { id: 'auto', name: 'Auto' },
    { id: 'on',   name: 'On'   },
    { id: 'off',  name: 'Off'  },
  ];

  // ── BUILD PLATE COMPATIBILITY ──────────────────────────────────────────────
  const BUILD_PLATE_COMPAT = {
    // material_group → { plate_id: 'good' | 'needs_prep' | 'avoid' }
    PLA:  { smooth_pei: 'good', textured_pei: 'good', cool_plate: 'good', engineering_plate: 'good', glass: 'good', garolite: 'avoid' },
    PETG: { smooth_pei: 'needs_prep', textured_pei: 'good', cool_plate: 'good', engineering_plate: 'good', glass: 'needs_prep', garolite: 'avoid' },
    ABS:  { smooth_pei: 'good', textured_pei: 'good', cool_plate: 'avoid', engineering_plate: 'good', glass: 'needs_prep', garolite: 'avoid' },
    ASA:  { smooth_pei: 'good', textured_pei: 'good', cool_plate: 'avoid', engineering_plate: 'good', glass: 'needs_prep', garolite: 'avoid' },
    TPU:  { smooth_pei: 'good', textured_pei: 'good', cool_plate: 'good', engineering_plate: 'good', glass: 'good', garolite: 'avoid' },
    PA:   { smooth_pei: 'needs_prep', textured_pei: 'needs_prep', cool_plate: 'avoid', engineering_plate: 'good', glass: 'avoid', garolite: 'good' },
    PC:   { smooth_pei: 'needs_prep', textured_pei: 'good', cool_plate: 'avoid', engineering_plate: 'good', glass: 'avoid', garolite: 'good' },
    PVA:  { smooth_pei: 'good', textured_pei: 'good', cool_plate: 'good', engineering_plate: 'good', glass: 'good', garolite: 'good' },
    HIPS: { smooth_pei: 'good', textured_pei: 'good', cool_plate: 'avoid', engineering_plate: 'good', glass: 'needs_prep', garolite: 'avoid' },
  };
  const BUILD_PLATE_NOTES = {
    smooth_pei:       { needs_prep: 'Apply glue stick as a release layer to prevent PETG from bonding to smooth PEI.',
                        avoid: 'This material is not recommended on smooth PEI — poor adhesion or risk of damage.' },
    textured_pei:     { needs_prep: 'Clean with IPA and apply thin glue stick layer for reliable adhesion.',
                        avoid: 'Not recommended on textured PEI for this material.' },
    cool_plate:       { avoid: 'Cool Plate (PEI-coated steel) cannot reach high enough temperatures for this material. Use engineering plate or textured PEI instead.' },
    engineering_plate: { needs_prep: 'Clean with IPA before use. Engineering plate provides excellent adhesion for engineering materials.',
                         avoid: 'Not recommended for this material on engineering plate.' },
    glass:            { needs_prep: 'Apply glue stick or hairspray for adhesion. Clean glass surface with IPA before applying.',
                        avoid: 'Glass bed is not suitable for this material — adhesion is unreliable.' },
    garolite:         { needs_prep: 'Garolite provides excellent adhesion for nylons. No prep needed if surface is clean.',
                        avoid: 'Garolite is specialized for nylon/PA materials — not recommended for this filament.' },
  };

  // ── Sort order + core item sets ─────────────────────────────────────────────
  const _MATERIAL_ORDER = [
    'pla_basic','pla_matte','pla_silk','pla_cf',
    'petg_basic','petg_hf','petg_cf',
    'abs','asa',
    'tpu_95a','tpu_90a','tpu_85a',
    'pa','pa_cf','pc','pet_cf',
    'pva','hips'
  ];
  const _CORE_MATERIALS = new Set(['pla_basic','pla_matte','petg_basic','abs','tpu_95a']);
  const _CORE_NOZZLES   = new Set(['std_0.4','hrd_0.4','std_0.6','prc_0.2']);
  const _CORE_SURFACE   = new Set(['draft','standard','fine']);

  // [MEDIUM-004] Shared layer-height formatter. Both the surface chip desc
  // (getFilters.surfaceDesc) and the profile emission site (resolveProfile's
  // layer_height) normalise through the same 2-decimal + trailing-zero-strip
  // rule so unusual floats (e.g. 0.200000001 from a future _clampNum edge)
  // can't diverge visually between "0.2 mm layers" (chip) and "0.200000001 mm"
  // (emission). IMPL-040 parity invariant.
  const _fmtLayer = lh => Number(lh).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');

  function _sortByOrder(items, order) {
    const idx = new Map(order.map((id, i) => [id, i]));
    return [...items].sort((a, b) => (idx.get(a.id) ?? 999) - (idx.get(b.id) ?? 999));
  }

  // ── FILTERS — built from loaded JSON + static arrays ────────────────────────
  // getFilters(state?) accepts an optional app state; when provided, chip descs
  // with state-dependent numbers (surface → layer_height clamped to printer max,
  // strength → wall/infill from data, support → Z gap from engine) get a numeric
  // prefix computed from the SAME source resolveProfile() emits. This is the
  // single-source-of-truth invariant: numbers users see must equal numbers the
  // engine emits. IMPL-040.
  function getFilters(state) {
    state = state || {};
    const printer    = state.printer ? getPrinter(state.printer) : null;
    const nozzle     = state.nozzle  ? getNozzle(state.nozzle)   : null;
    const nozzleSize = nozzle ? nozzle.size : null;
    const limits     = (printer && nozzleSize) ? getPrinterLimits(printer, nozzleSize) : null;

    // Given a surface preset, return the actual layer height the engine would
    // emit for the current printer+nozzle (i.e. the raw value clamped to the
    // printer's max_layer_height). Same code path resolveProfile uses for
    // p.layer_height at line ~1259.
    const effectiveLayerHeight = (surface) => {
      if (!surface) return null;
      if (!limits) return surface.layer_height;
      return _clampNum(surface.layer_height, limits.min_layer_height, limits.max_layer_height);
    };

    // Build desc with computed prefix when available. Keeps qualitative desc
    // intact when state is missing so the filter list still renders cleanly
    // before the user has picked a printer/nozzle.
    const surfaceDesc = (s) => {
      const lh = effectiveLayerHeight(s);
      if (lh == null) return s.desc;
      const lhFmt = _fmtLayer(lh);
      const prefix = s.ironing ? `${lhFmt} mm + ironing` : `${lhFmt} mm layers`;
      return `${prefix} — ${s.desc}`;
    };
    const strengthDesc = (s) => {
      const prefix = s.infill_pattern && s.infill_pattern !== 'Grid' && s.infill_pattern !== 'Cross Hatch'
        ? `${s.wall_loops} walls · ${s.infill_density}% ${s.infill_pattern}`
        : `${s.wall_loops} walls · ${s.infill_density}%`;
      return `${prefix} — ${s.desc}`;
    };
    // [LOW-010] Support chip descs pull from the unified _SUPPORT_TYPES table
    // so the chip and the emission (resolveProfile) read byte-identical values.
    const supportById = Object.fromEntries(_SUPPORT_TYPES.map(s => [s.id, s]));

    const printerChips  = _printers.map(p => ({ id: p.id, name: p.name }));
    const nozzleChips   = _nozzles.map(n => ({ id: n.id, name: n.name, core: _CORE_NOZZLES.has(n.id) }));
    const materialChips = _sortByOrder(
      _materials.map(m => ({ id: m.id, name: m.name, core: _CORE_MATERIALS.has(m.id) })),
      _MATERIAL_ORDER
    );
    const surfaceChips  = (_objectives.surface_quality || []).map(s => ({ id: s.id, name: s.name, desc: surfaceDesc(s),  core: _CORE_SURFACE.has(s.id) }));
    const strengthChips = (_objectives.strength_levels || []).map(s => ({ id: s.id, name: s.name, desc: strengthDesc(s) }));
    const speedChips    = (_objectives.speed_priority  || []).map(s => ({ id: s.id, name: s.name, desc: s.desc }));
    const envChips      = _envRules.map(e => ({ id: e.id, name: e.name, desc: e.desc }));

    return [
      { key: 'printer',     label: t('filterPrinter'),  multi: false, required: true,  items: printerChips  },
      { key: 'material',    label: t('filterMaterial'), multi: false, required: true,  items: materialChips },
      { key: 'nozzle',      label: t('filterNozzle'),   multi: false, required: true,  items: nozzleChips   },
      { key: 'useCase',     label: t('filterUseCase'),  multi: true,  required: false, items: [
        { id: 'prototype',  name: t('ucPrototype'),  desc: 'Quick iteration — speed over finish, infill combination enabled.' },
        { id: 'functional', name: t('ucFunctional'), desc: 'Load-bearing parts — tighter tolerances, stronger walls.' },
        { id: 'decorative', name: t('ucDecorative'), desc: 'Visual display — prioritizes surface finish and detail.' },
        { id: 'miniature',  name: t('ucMiniature'),  desc: 'Small detailed models — Arachne walls, fine layers recommended.' },
        { id: 'large',      name: t('ucLarge'),      desc: 'Large prints — brim added, tall-print slowdown enabled.' },
      ]},
      { key: 'surface',     label: t('filterSurface'),   multi: false, required: false, items: surfaceChips  },
      { key: 'strength',    label: t('filterStrength'),  multi: false, required: false, items: strengthChips },
      { key: 'speed',       label: t('filterSpeed'),     multi: false, required: false, items: speedChips    },
      { key: 'environment', label: t('filterEnv'),       multi: false, required: false, items: envChips      },
      { key: 'support',     label: t('filterSupport'),   multi: false, required: false, items: [
        { id: 'none',           name: t('supNone'),          desc: 'No support material generated.' },
        { id: 'easy',           name: t('supEasy'),          desc: `${supportById.easy.type} · Z ${supportById.easy.z_gap} mm — supports snap off easily, rougher underside.` },
        { id: 'balanced',       name: t('supBalanced'),      desc: `${supportById.balanced.type} · Z ${supportById.balanced.z_gap} mm — reasonable removal with decent underside.` },
        { id: 'best_underside', name: t('supBestUnderside'), desc: `${supportById.best_underside.type} · Z ${supportById.best_underside.z_gap} mm — smooth underside, supports harder to remove.` },
      ]},
      { key: 'colors',      label: t('filterColors'),   multi: false, required: false, items: [
        { id: 'single',    name: t('colSingle'),  desc: 'Single filament — no prime tower needed.' },
        { id: 'multi_2_4', name: t('colMulti24'), desc: '2–4 colors — prime tower enabled to prevent color bleed.' },
        { id: 'multi_5',   name: t('colMulti5'),  desc: '5+ colors — flush into infill saves material on large palettes.' },
      ]},
      { key: 'userLevel',   label: t('filterLevel'),    multi: false, required: false, items: [
        { id: 'beginner',     name: t('lvlBeginner'), desc: t('lvlBeginnerDesc') },
        { id: 'intermediate', name: t('lvlInter'),    desc: t('lvlInterDesc')    },
        { id: 'advanced',     name: t('lvlAdvanced'), desc: t('lvlAdvancedDesc') },
      ]},
      { key: 'seam',             label: t('filterSeam'),             multi: false, required: false, advanced: true, items: [
        { id: 'aligned',         name: t('seamAligned'),   desc: 'Seams line up vertically — visible line but predictable placement.' },
        { id: 'sharpest_corner', name: t('seamSharpest'),  desc: 'Hides seams at sharp corners — best for geometric models.' },
        { id: 'random',          name: t('seamRandom'),    desc: 'Seams scattered randomly — no visible line but subtle texture.' },
        { id: 'back',            name: t('seamBack'),      desc: 'Seams placed at the back — hidden from front view.' },
      ]},
      { key: 'brim',             label: t('filterBrim'),             multi: false, required: false, advanced: true, items: [
        { id: 'auto',       name: t('brimAuto'),      desc: 'Engine decides based on material shrink risk and part geometry.' },
        { id: 'none',       name: t('brimNone'),      desc: 'No brim — clean edges, relies on bed adhesion alone.' },
        { id: 'small',      name: t('brimSmall'),     desc: '5mm brim — light adhesion boost, easy to remove.' },
        { id: 'large',      name: t('brimLarge'),     desc: '10mm brim — strong adhesion for warp-prone materials.' },
        { id: 'mouse_ears', name: t('brimMouseEars'), desc: 'Brim only at corners — prevents lifting with minimal cleanup.' },
      ]},
      { key: 'build_plate',     label: t('filterBuildPlate'),       multi: false, required: false, advanced: true, items: [
        { id: 'smooth_pei',       name: t('bpSmoothPEI'),   desc: 'Glossy bottom finish. Use glue as release agent for PETG.' },
        { id: 'textured_pei',     name: t('bpTexturedPEI'), desc: 'Matte finish, great adhesion, easy release for most materials.' },
        { id: 'cool_plate',       name: t('bpCoolPlate'),   desc: 'For PLA and TPU. Limited to lower bed temperatures.' },
        { id: 'engineering_plate', name: t('bpEngineering'), desc: 'For high-temp materials (PC, PA). Heat resistant.' },
        { id: 'glass',            name: t('bpGlass'),       desc: 'Smooth finish, needs glue stick for adhesion.' },
        { id: 'garolite',         name: t('bpGarolite'),    desc: 'Best for Nylon (PA) — excellent adhesion without glue.' },
      ]},
      { key: 'extruder_type',   label: t('filterExtruderType'),     multi: false, required: false, advanced: true, items: [
        { id: 'direct_drive', name: t('extDirectDrive'), desc: 'Short filament path — better retraction, handles flexibles well.' },
        { id: 'bowden',       name: t('extBowden'),      desc: 'Long PTFE tube — higher retraction needed, struggles with soft TPU.' },
      ]},
      { key: 'filament_condition', label: t('filterFilamentCond'),   multi: false, required: false, advanced: true, items: [
        { id: 'freshly_dried',   name: t('fcDried'),   desc: 'Dried within 24h — optimal for moisture-sensitive materials.' },
        { id: 'opened_recently', name: t('fcOpened'),  desc: 'Opened within a week — fine for PLA, risky for PA/TPU.' },
        { id: 'unknown',         name: t('fcUnknown'), desc: 'Unknown condition — drying warning added for hygroscopic materials.' },
      ]},
      { key: 'ironing',         label: t('filterIroning'),          multi: false, required: false, advanced: true, items: [
        { id: 'auto', name: t('ironAuto'), desc: 'Engine decides based on surface quality level (on at Fine+).' },
        { id: 'on',   name: t('ironOn'),   desc: 'Iron top surfaces — smooths visible layers, adds print time.' },
        { id: 'off',  name: t('ironOff'),  desc: 'No ironing — faster, acceptable for non-visible surfaces.' },
      ]},
      { key: 'special',     label: t('filterSpecial'),  multi: true,  required: false, items: [
        { id: 'waterproof',   name: t('spWaterproof'), desc: 'Extra walls and top layers to prevent water penetration.' },
        { id: 'high_temp',    name: t('spHighTemp'),   desc: 'Part will face heat — suggests ABS/ASA/PC materials.' },
        { id: 'metallic',     name: t('spMetallic'),   desc: 'Metallic finish — slower outer wall for best sheen.' },
        { id: 'matte',        name: t('spMatte'),      desc: 'Matte surface — layer lines less visible naturally.' },
        { id: 'glossy',       name: t('spGlossy'),     desc: 'Glossy finish — ironing and fine layers recommended.' },
        { id: 'uv_resistant', name: t('spUV'),         desc: 'Outdoor use — suggests ASA or UV-resistant materials.' },
      ]},
    ];
  }

  // ── Profile Tabs — per-slicer section structure ──────────────────────────────
  // Each slicer has its own tab layout with section names matching the slicer UI.
  // The parameter keys are identical across slicers — only presentation changes.
  let _activeSlicer = 'bambu_studio';

  const SLICER_TABS = {
    bambu_studio: [
      {
        id: 'quality', label: 'Quality', desc: 'Layer height, line width, wall precision, seam placement, and surface finish.',
        sections: [
          { label: 'Layer height',    params: ['layer_height', 'initial_layer_height'] },
          { label: 'Line width',      params: ['outer_wall_line_width', 'inner_wall_line_width', 'top_surface_line_width'] },
          { label: 'Seam',            params: ['seam_position'] },
          { label: 'Precision',       params: ['arc_fitting', 'xy_hole_compensation', 'elephant_foot_compensation'] },
          { label: 'Ironing',         params: ['ironing'] },
          { label: 'Wall generator',  params: ['wall_generator'] },
          { label: 'Advanced',        params: ['order_of_walls', 'bridge_flow', 'only_one_wall_top', 'avoid_crossing_walls'] },
        ],
      },
      {
        id: 'strength', label: 'Strength', desc: 'Wall count, infill pattern and density, top/bottom shell thickness.',
        sections: [
          { label: 'Walls',             params: ['wall_loops'] },
          { label: 'Top/bottom shells',  params: ['top_shell_layers', 'bottom_shell_layers', 'top_surface_pattern', 'bottom_surface_pattern', 'internal_solid_infill_pattern'] },
          { label: 'Sparse infill',     params: ['sparse_infill_density', 'sparse_infill_pattern'] },
          { label: 'Advanced',          params: ['infill_combination'] },
        ],
      },
      {
        id: 'speed', label: 'Speed', desc: 'Print move speeds, acceleration limits, and initial layer settings.',
        sections: [
          { label: 'Initial layer speed', params: ['initial_layer_speed'] },
          { label: 'Other layers speed',  params: ['outer_wall_speed', 'inner_wall_speed', 'top_surface_speed', 'gap_fill_speed'] },
          { label: 'Acceleration',        params: ['outer_wall_acceleration', 'inner_wall_acceleration', 'initial_layer_acceleration'] },
        ],
      },
      {
        id: 'support', label: 'Support', desc: 'Support type, pattern, interface quality, and removal settings.',
        sections: [
          { label: 'Support',   params: ['support_type', 'support_style', 'support_threshold_angle'] },
          { label: 'Advanced',  params: ['support_z_distance', 'support_interface_layers', 'support_interface_pattern'] },
        ],
      },
      {
        id: 'others', label: 'Others', desc: 'Brim, prime tower, purge options, and special print modes.',
        sections: [
          { label: 'Bed adhesion',  params: ['brim_width'] },
          { label: 'Prime tower',   params: ['prime_tower'] },
          { label: 'Purge options', params: ['flush_into_infill'] },
          { label: 'Special mode',  params: ['slow_down_tall'] },
        ],
      },
    ],
    prusaslicer: [
      {
        id: 'quality', label: 'Quality', desc: 'Layer height, perimeter quality, seam, wall generator, and bridging.',
        sections: [
          { label: 'Layer height',       params: ['layer_height', 'initial_layer_height'] },
          { label: 'Horizontal shells',  params: ['top_shell_layers', 'bottom_shell_layers'] },
          { label: 'Quality',            params: ['avoid_crossing_walls', 'bridge_flow'] },
          { label: 'Advanced',           params: ['seam_position', 'order_of_walls', 'wall_generator'] },
          { label: 'Only one perimeter', params: ['only_one_wall_top'] },
        ],
      },
      {
        id: 'strength', label: 'Strength', desc: 'Infill pattern and density, ironing, and print time optimizations.',
        sections: [
          { label: 'Infill',                  params: ['sparse_infill_density', 'sparse_infill_pattern', 'top_surface_pattern', 'bottom_surface_pattern', 'internal_solid_infill_pattern'] },
          { label: 'Ironing',                 params: ['ironing'] },
          { label: 'Reducing printing time',  params: ['infill_combination'] },
        ],
      },
      {
        id: 'speed', label: 'Speed', desc: 'Print move speeds, first layer modifiers, and acceleration control.',
        sections: [
          { label: 'Speed for print moves',  params: ['outer_wall_speed', 'inner_wall_speed', 'top_surface_speed', 'gap_fill_speed'] },
          { label: 'Modifiers',              params: ['initial_layer_speed'] },
          { label: 'Acceleration control',   params: ['outer_wall_acceleration', 'inner_wall_acceleration', 'initial_layer_acceleration'] },
        ],
      },
      {
        id: 'support', label: 'Support', desc: 'Support material type, overhang threshold, and interface settings.',
        sections: [
          { label: 'Support material',              params: ['support_type', 'support_style', 'support_threshold_angle'] },
          { label: 'Options for support material',  params: ['support_z_distance', 'support_interface_layers', 'support_interface_pattern'] },
        ],
      },
      {
        id: 'others', label: 'Others', desc: 'Skirt, brim, wipe tower, and advanced print options.',
        sections: [
          { label: 'Skirt and brim',  params: ['brim_width'] },
          { label: 'Wipe tower',      params: ['prime_tower'] },
          { label: 'Advanced',        params: ['flush_into_infill', 'slow_down_tall'] },
        ],
      },
    ],
    orcaslicer: [
      {
        id: 'quality', label: 'Quality', desc: 'Layer height, line width, seam, precision, ironing, and wall settings.',
        sections: [
          { label: 'Layer height',       params: ['layer_height', 'initial_layer_height'] },
          { label: 'Line width',         params: ['outer_wall_line_width', 'inner_wall_line_width', 'top_surface_line_width'] },
          { label: 'Seam',              params: ['seam_position'] },
          { label: 'Precision',          params: ['arc_fitting', 'xy_hole_compensation', 'elephant_foot_compensation'] },
          { label: 'Ironing',           params: ['ironing'] },
          { label: 'Wall generator',     params: ['wall_generator'] },
          { label: 'Walls and surfaces', params: ['order_of_walls', 'only_one_wall_top', 'avoid_crossing_walls'] },
          { label: 'Bridging',          params: ['bridge_flow'] },
        ],
      },
      {
        id: 'strength', label: 'Strength', desc: 'Wall count, infill pattern and density, top/bottom shell thickness.',
        sections: [
          { label: 'Walls',             params: ['wall_loops'] },
          { label: 'Top/bottom shells',  params: ['top_shell_layers', 'bottom_shell_layers', 'top_surface_pattern', 'bottom_surface_pattern', 'internal_solid_infill_pattern'] },
          { label: 'Infill',            params: ['sparse_infill_density', 'sparse_infill_pattern'] },
          { label: 'Advanced',          params: ['infill_combination'] },
        ],
      },
      {
        id: 'speed', label: 'Speed', desc: 'Print move speeds, first layer speed, and acceleration settings.',
        sections: [
          { label: 'First layer speed',  params: ['initial_layer_speed'] },
          { label: 'Other layers speed',  params: ['outer_wall_speed', 'inner_wall_speed', 'top_surface_speed', 'gap_fill_speed'] },
          { label: 'Acceleration',        params: ['outer_wall_acceleration', 'inner_wall_acceleration', 'initial_layer_acceleration'] },
        ],
      },
      {
        id: 'support', label: 'Support', desc: 'Support type, pattern, interface quality, and removal settings.',
        sections: [
          { label: 'Support',   params: ['support_type', 'support_style', 'support_threshold_angle'] },
          { label: 'Advanced',  params: ['support_z_distance', 'support_interface_layers', 'support_interface_pattern'] },
        ],
      },
      {
        id: 'others', label: 'Others', desc: 'Skirt, brim, prime tower, flush options, and special modes.',
        sections: [
          { label: 'Skirt',          params: [] },
          { label: 'Brim',           params: ['brim_width'] },
          { label: 'Prime tower',    params: ['prime_tower'] },
          { label: 'Flush options',  params: ['flush_into_infill'] },
          { label: 'Special mode',   params: ['slow_down_tall'] },
        ],
      },
    ],
  };

  // ── Parameter Labels — per-slicer display names ─────────────────────────────
  // Parameter keys are identical; only the human-readable labels change per slicer.
  const SLICER_PARAM_LABELS = {
    bambu_studio: {
      layer_height:                  'Layer height',
      initial_layer_height:          'Initial layer height',
      wall_generator:                'Wall generator',
      seam_position:                 'Seam position',
      order_of_walls:                'Order of walls',
      xy_hole_compensation:          'X-Y hole compensation',
      elephant_foot_compensation:    'Elephant foot compensation',
      outer_wall_line_width:         'Outer wall line width',
      inner_wall_line_width:         'Inner wall line width',
      top_surface_line_width:        'Top surface line width',
      arc_fitting:                   'Arc fitting',
      avoid_crossing_walls:          'Avoid crossing walls',
      only_one_wall_top:             'Only one wall on top surfaces',
      bridge_flow:                   'Bridge flow',
      wall_loops:                    'Wall loops',
      top_shell_layers:              'Top shell layers',
      bottom_shell_layers:           'Bottom shell layers',
      sparse_infill_pattern:         'Sparse infill pattern',
      sparse_infill_density:         'Sparse infill density',
      top_surface_pattern:           'Top surface pattern',
      bottom_surface_pattern:        'Bottom surface pattern',
      internal_solid_infill_pattern: 'Internal solid infill pattern',
      infill_combination:            'Infill combination',
      outer_wall_speed:              'Outer wall speed',
      inner_wall_speed:              'Inner wall speed',
      initial_layer_speed:           'Initial layer speed',
      top_surface_speed:             'Top surface speed',
      gap_fill_speed:                'Gap fill speed',
      outer_wall_acceleration:       'Outer wall acceleration',
      inner_wall_acceleration:       'Inner wall acceleration',
      initial_layer_acceleration:    'Initial layer acceleration',
      support_type:                  'Support type',
      support_style:                 'Support style',
      support_threshold_angle:       'Threshold angle',
      support_z_distance:            'Top Z distance',
      support_interface_layers:      'Interface layers (top)',
      support_interface_pattern:     'Interface pattern',
      prime_tower:                   'Prime tower',
      flush_into_infill:             'Flush into infill',
      ironing:                       'Ironing',
      slow_down_tall:                'Slow down for tall prints',
      brim_width:                    'Brim width',
      retraction_distance:           'Retraction length',
      retraction_speed:              'Retraction speed',
      pressure_advance:              'Pressure advance',
      fan_speed:                     'Fan speed',
    },
    prusaslicer: {
      layer_height:                  'Layer height',
      initial_layer_height:          'First layer height',
      wall_generator:                'Perimeter generator',
      seam_position:                 'Seam position',
      order_of_walls:                'External perimeters first',
      xy_hole_compensation:          'XY Size Compensation',
      elephant_foot_compensation:    'Elephant foot compensation',
      outer_wall_line_width:         'External perimeters width',
      inner_wall_line_width:         'Perimeters width',
      top_surface_line_width:        'Top solid infill width',
      arc_fitting:                   'Arc fitting',
      avoid_crossing_walls:          'Avoid crossing perimeters',
      only_one_wall_top:             'Single perimeter on top surfaces',
      bridge_flow:                   'Bridge flow ratio',
      wall_loops:                    'Perimeters',
      top_shell_layers:              'Top solid layers',
      bottom_shell_layers:           'Bottom solid layers',
      sparse_infill_pattern:         'Fill pattern',
      sparse_infill_density:         'Fill density',
      top_surface_pattern:           'Top fill pattern',
      bottom_surface_pattern:        'Bottom fill pattern',
      internal_solid_infill_pattern: 'Internal solid infill pattern',
      infill_combination:            'Combine infill every',
      outer_wall_speed:              'External perimeters',
      inner_wall_speed:              'Perimeters',
      initial_layer_speed:           'First layer speed',
      top_surface_speed:             'Top solid infill',
      gap_fill_speed:                'Gap fill',
      outer_wall_acceleration:       'External perimeters accel',
      inner_wall_acceleration:       'Perimeters accel',
      initial_layer_acceleration:    'First layer accel',
      support_type:                  'Generate support material',
      support_style:                 'Style',
      support_threshold_angle:       'Overhang threshold',
      support_z_distance:            'Top contact Z distance',
      support_interface_layers:      'Top interface layers',
      support_interface_pattern:     'Interface pattern',
      prime_tower:                   'Wipe tower',
      flush_into_infill:             'Purge into infill',
      ironing:                       'Enable ironing',
      slow_down_tall:                'Slow down for tall prints',
      brim_width:                    'Brim width',
      retraction_distance:           'Retraction length',
      retraction_speed:              'Retraction speed',
      pressure_advance:              'Pressure advance',
      fan_speed:                     'Fan speed',
    },
    orcaslicer: {
      layer_height:                  'Layer height',
      initial_layer_height:          'First layer height',
      wall_generator:                'Wall generator',
      seam_position:                 'Seam position',
      order_of_walls:                'Walls printing order',
      xy_hole_compensation:          'X-Y hole compensation',
      elephant_foot_compensation:    'Elephant foot compensation',
      outer_wall_line_width:         'Outer wall line width',
      inner_wall_line_width:         'Inner wall line width',
      top_surface_line_width:        'Top surface line width',
      arc_fitting:                   'Arc fitting',
      avoid_crossing_walls:          'Avoid crossing walls',
      only_one_wall_top:             'Only one wall on top surfaces',
      bridge_flow:                   'Bridge flow ratio',
      wall_loops:                    'Wall loops',
      top_shell_layers:              'Top shell layers',
      bottom_shell_layers:           'Bottom shell layers',
      sparse_infill_pattern:         'Sparse infill pattern',
      sparse_infill_density:         'Sparse infill density',
      top_surface_pattern:           'Top surface pattern',
      bottom_surface_pattern:        'Bottom surface pattern',
      internal_solid_infill_pattern: 'Internal solid infill pattern',
      infill_combination:            'Infill combination',
      outer_wall_speed:              'Outer wall',
      inner_wall_speed:              'Inner wall',
      initial_layer_speed:           'First layer',
      top_surface_speed:             'Top surface',
      gap_fill_speed:                'Gap infill',
      outer_wall_acceleration:       'Outer wall',
      inner_wall_acceleration:       'Inner wall',
      initial_layer_acceleration:    'First layer',
      support_type:                  'Type',
      support_style:                 'Style',
      support_threshold_angle:       'Threshold angle',
      support_z_distance:            'Top Z distance',
      support_interface_layers:      'Top interface layers',
      support_interface_pattern:     'Interface pattern',
      prime_tower:                   'Prime tower',
      flush_into_infill:             'Flush into objects\' infill',
      ironing:                       'Ironing type',
      slow_down_tall:                'Slow down for tall prints',
      brim_width:                    'Brim width',
      retraction_distance:           'Retraction distance',
      retraction_speed:              'Retraction speed',
      pressure_advance:              'Pressure advance',
      fan_speed:                     'Fan speed',
    },
  };

  // ── Slicer resolution ───────────────────────────────────────────────────────
  function getSlicerForPrinter(printerId) {
    const printer = getPrinter(printerId);
    if (!printer) return 'bambu_studio';
    const brand = _brands.find(b => b.id === printer.manufacturer);
    return brand?.default_slicer || 'bambu_studio';
  }
  function setActiveSlicer(id) { _activeSlicer = SLICER_TABS[id] ? id : 'bambu_studio'; }
  function getActiveSlicer()   { return _activeSlicer; }

  // ── Data accessors ───────────────────────────────────────────────────────────
  function getPrinter(id)   { return _printers.find(p => p.id === id);                       }
  function getMaterial(id)  { return _materials.find(m => m.id === id);                      }
  function getNozzle(id)    { return _nozzles.find(n => n.id === id);                        }
  function getEnv(id)       { return _envRules.find(e => e.id === id);                       }
  function getSurface(id)   { return (_objectives.surface_quality || []).find(s => s.id === id); }
  function getStrength(id)  { return (_objectives.strength_levels || []).find(s => s.id === id); }
  function getSpeedMode(id) { return (_objectives.speed_priority  || []).find(s => s.id === id); }

  // ── Printer capability limits (IMPL-039) ────────────────────────────────────
  // Returns { max_layer_height, min_layer_height, max_line_width, max_outer_wall_speed,
  //          max_inner_wall_speed, max_travel_speed } for a given printer + nozzle.
  // Formula defaults match Bambu/Prusa/Orca convention (verified against the vendor
  // preset JSONs in `bambu configs/`). A printer may shadow any value via an optional
  // `limits_override` field in printers.json for printers whose firmware is tighter
  // than the formula (e.g. Ender 3 V3 SE caps outer wall speed below the default).
  function getPrinterLimits(printer, nozzleSize) {
    if (!printer || !nozzleSize) return null;
    const override = printer.limits_override || {};
    // [MEDIUM-001] Numeric-compare override keys so "0.40"/"0.4 "/0.4 all resolve.
    // Previously String(0.4) === "0.4" string-matched a "0.4" key only; a data entry
    // keyed "0.40" or with a trailing space silently fell through to formula defaults.
    const nzTarget = Number(nozzleSize);
    const nzOverrideEntry = Object.entries(override.nozzles || {})
      .find(([k]) => Number(k) === nzTarget);
    const nzOverride = (nzOverrideEntry && nzOverrideEntry[1]) || {};
    const mOverride = override.motion || {};
    const maxSpeed = printer.max_speed || 500;

    // Nozzle-driven geometry limits (universal — same across major slicers)
    const max_layer_height = nzOverride.max_layer_height ?? +(nozzleSize * 0.70).toFixed(3);
    const min_layer_height = nzOverride.min_layer_height ?? +(nozzleSize * 0.20).toFixed(3);
    const max_line_width   = nzOverride.max_line_width   ?? +(nozzleSize * 2.00).toFixed(3);

    // Motion limits (printer-driven, conservative — outer ~40%, inner ~60% of max_speed)
    const max_outer_wall_speed = mOverride.max_outer_wall_speed ?? Math.min(Math.round(maxSpeed * 0.40), 300);
    const max_inner_wall_speed = mOverride.max_inner_wall_speed ?? Math.min(Math.round(maxSpeed * 0.60), 500);
    const max_travel_speed     = mOverride.max_travel_speed     ?? maxSpeed;

    return { max_layer_height, min_layer_height, max_line_width,
             max_outer_wall_speed, max_inner_wall_speed, max_travel_speed };
  }

  // Clamp a numeric value into [min, max], return the clamped value.
  // Does NOT emit warnings — warning generation is centralized in getWarnings so
  // resolveProfile + getWarnings stay pure functions of state.
  function _clampNum(value, min, max) {
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    if (!isFinite(n)) {
      // [HIGH-009] Non-finite fallback: return a finite bound so callers never
      // receive undefined/null/NaN and crash on .toFixed() or emit "undefined mm"
      // via template literals. Prefer min (safer lower-bound default); fall back
      // to max for call sites that pass null for min (wall-speed, line-width);
      // final 0 is defensive — unreachable for current call sites.
      if (typeof min === 'number' && isFinite(min)) return +(+min).toFixed(3);
      if (typeof max === 'number' && isFinite(max)) return +(+max).toFixed(3);
      return 0;
    }
    if (max != null && n > max + 1e-6) return +(+max).toFixed(3);
    if (min != null && n < min - 1e-6) return +(+min).toFixed(3);
    return n;
  }

  // Substitute a pattern/generator value for the target slicer if the slicer's
  // valid-value set doesn't contain the original. Returns the original value
  // unchanged when no substitution is needed, OR when slicer_capabilities.json
  // is not yet loaded (fail-open so old callers keep working during init).
  // Matching is loose — "Cross Hatch" / "crosshatch" / "Cross-Hatch" all compare
  // equal, so we can keep UI-display names and vendor-import names in harmony.
  // Example: mapForSlicer('Cross Hatch', 'sparse_infill_pattern', 'prusaslicer')
  //   → 'rectilinear' (from slicer_capabilities.fallbacks; caller re-capitalizes)
  function mapForSlicer(value, field, slicer) {
    if (!_slicerCaps || !value || !field || !slicer) return value;
    const slicerCap = _slicerCaps.slicers && _slicerCaps.slicers[slicer];
    if (!slicerCap) return value;

    const norm = s => String(s).toLowerCase().trim().replace(/[\s_-]+/g, '');
    const normalized = norm(value);
    const fieldKey = field.endsWith('s') ? field : field + 's';  // accept singular or plural
    const validSet = slicerCap[fieldKey] || slicerCap[field + '_patterns'] || slicerCap[field];

    if (!validSet || !Array.isArray(validSet)) return value;
    // Loose containment check — compare after stripping whitespace/underscores/dashes
    if (validSet.some(v => norm(v) === normalized)) return value;

    const fallbackMap = _slicerCaps.fallbacks && _slicerCaps.fallbacks[field];
    if (fallbackMap) {
      // Also loose-match fallback keys
      const matchingKey = Object.keys(fallbackMap).find(k => norm(k) === normalized);
      if (matchingKey && fallbackMap[matchingKey][slicer]) {
        return fallbackMap[matchingKey][slicer];
      }
    }
    // No explicit fallback — return the first valid value as a safe default
    return validSet[0];
  }

  // ── Brand / printer picker helpers ────────────────────────────────────────────
  function buildModelDesc(p) {
    const parts = [];
    if (p.active_chamber_heating) parts.push('Active heated');
    else if (p.enclosure === 'passive') parts.push('Enclosed');
    else if (p.enclosure === 'none') parts.push('Open');
    if (p.max_speed >= 700) parts.push(p.max_speed + ' mm/s');
    return parts.join(' · ') || p.series;
  }

  function getBrands() {
    return _brands
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(b => ({
        id:      b.id,
        name:    b.name,
        primary: b.primary,
        count:   _printers.filter(p => p.manufacturer === b.id).length,
      }));
  }

  function getPrintersByBrand(brandId) {
    const brandPrinters = _printers.filter(p => p.manufacturer === brandId);
    const groups = [];
    const seen = new Set();
    brandPrinters.forEach(p => {
      const g = p.series_group || 'Other';
      if (!seen.has(g)) { seen.add(g); groups.push({ label: g, models: [] }); }
      groups.find(gr => gr.label === g).models.push({
        id: p.id, name: p.name, desc: buildModelDesc(p),
      });
    });
    return groups;
  }

  function searchPrinters(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return _printers
      .filter(p => {
        const brand = _brands.find(b => b.id === p.manufacturer);
        const haystack = `${brand ? brand.name : ''} ${p.name} ${p.series_group || ''}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8)
      .map(p => {
        const brand = _brands.find(b => b.id === p.manufacturer);
        return {
          id:        p.id,
          name:      p.name,
          brandId:   p.manufacturer,
          brandName: brand ? brand.name : p.manufacturer,
          desc:      buildModelDesc(p),
        };
      });
  }

  // ── Enclosure display helper ──────────────────────────────────────────────────
  function getEnclosureDisplay(mat) {
    const eb = mat.enclosure_behavior || {};
    if (mat.enclosure_required || eb.enclosure_required) return 'Fully enclosed — required';
    if (eb.open_door_threshold_bed_temp != null)
      return `Open door + remove lid when bed >${eb.open_door_threshold_bed_temp}°C`;
    if (eb.enclosure_strongly_recommended) return 'Enclosed strongly recommended';
    if (eb.enclosed_preferred) return 'Enclosed preferred (open frame OK)';
    if (eb.open_preferred)     return 'Open frame preferred';
    return 'Open frame OK';
  }

  // ── Filament profile (legacy-compatible shape for app.js) ────────────────────
  function getFilamentProfile(materialId) {
    const mat = getMaterial(materialId);
    if (!mat) return null;
    const bs = mat.base_settings;
    return {
      nozzle_temp_base: bs.nozzle_temp_base,
      bed_temp_base:    bs.bed_temp_base,
      cooling_fan:      bs.cooling_fan,
      cooling_fan_min:  bs.cooling_fan_min,
      cooling_overhang: bs.cooling_fan_overhang,
      slow_layer_time:  bs.slow_layer_time,
      build_plate:      mat.build_plate_display,
      ams:              mat.ams_compatible,
      drying:           mat.drying.display,
      enclosure:        getEnclosureDisplay(mat),
      max_mvs:          bs.max_mvs,
      pressure_advance: bs.pressure_advance,
      flow_ratio:       bs.flow_ratio,
      retraction:       bs.retraction_length,
      notes:            mat.notes,
      warnings:         mat.warnings,
    };
  }

  // ── Temperature with environment + nozzle material offset ───────────────────
  // nozzleId is optional — pass it to include nozzle material compensation
  function getAdjustedTemps(materialId, environmentId, nozzleId, speedId) {
    const mat    = getMaterial(materialId);
    const env    = getEnv(environmentId);
    const nozzle = nozzleId ? getNozzle(nozzleId) : null;
    if (!mat) return { nozzle: '—', bed: '—' };

    const bs           = mat.base_settings;
    const envNozzleAdj = env    ? (env.nozzle_adj || 0) : 0;
    const envBedAdj    = env    ? (env.bed_adj    || 0) : 0;
    const nozzleOffset = nozzle ? (nozzle.temp_offset || 0) : 0;
    const speedAdj     = speedId === 'fast' ? 5 : 0;
    const totalNozzle  = envNozzleAdj + nozzleOffset + speedAdj;

    let nozzleStr = `${bs.nozzle_temp_base + totalNozzle} °C`;
    if (totalNozzle > 0) nozzleStr += `  (+${totalNozzle} adj)`;

    let bedStr = `${bs.bed_temp_base + envBedAdj} °C`;
    if (envBedAdj > 0) bedStr += `  (+${envBedAdj} for environment)`;

    return { nozzle: nozzleStr, bed: bedStr };
  }

  // ── Resolve PA from k_factor_matrix (nozzle-specific) or fallback ────────────
  function _resolvePA(bs, nozzle) {
    if (bs.k_factor_matrix && nozzle) {
      const nzStr = String(nozzle.size);
      const keys = Object.keys(bs.k_factor_matrix).sort((a, b) => Number(a) - Number(b));
      const kKey = keys.includes(nzStr) ? nzStr : keys.reduce((prev, curr) =>
        Math.abs(Number(curr) - nozzle.size) < Math.abs(Number(prev) - nozzle.size) ? curr : prev
      );
      return bs.k_factor_matrix[kKey];
    }
    return bs.pressure_advance;
  }

  // ── Advanced filament settings ────────────────────────────────────────────────
  function getAdvancedFilamentSettings(state) {
    const mat     = getMaterial(state.material);
    const env     = getEnv(state.environment);
    const nozzle  = getNozzle(state.nozzle);
    const printer = getPrinter(state.printer);
    if (!mat) return null;

    const bs           = mat.base_settings;
    const isPETG       = mat.group === 'PETG';
    const nozzleAdj    = (env ? (env.nozzle_adj || 0) : 0) + (nozzle ? (nozzle.temp_offset || 0) : 0);
    const bedAdj       = env ? (env.bed_adj || 0) : 0;

    const initNozzle  = bs.nozzle_temp_base + nozzleAdj + (bs.initial_layer_nozzle_offset || 5);
    const otherNozzle = bs.nozzle_temp_base + nozzleAdj;
    let   initBed     = bs.bed_temp_base + bedAdj + (bs.initial_layer_bed_offset || 0) + (isPETG ? 5 : 0);
    let   otherBed    = bs.bed_temp_base + bedAdj;

    // Clamp bed targets to min(material.bed_temp_max, printer.max_bed_temp). A
    // bed that can't reach the target silently produces warped or failed prints.
    // See [CRITICAL-002]. Warnings are emitted from getWarnings (same invariant
    // as _clampNum — clamp here, warn there).
    const bedCap = printer && printer.max_bed_temp != null
      ? Math.min(bs.bed_temp_max, printer.max_bed_temp)
      : bs.bed_temp_max;
    initBed  = Math.min(initBed,  bedCap);
    otherBed = Math.min(otherBed, bedCap);

    return {
      initial_layer_temp:     `${initNozzle} °C`,
      other_layers_temp:      `${otherNozzle} °C`,
      initial_layer_bed_temp: `${initBed} °C`,
      other_layers_bed_temp:  `${otherBed} °C`,
      cooling_fan_min:        bs.cooling_fan_min,
      cooling_fan_overhang:   bs.cooling_fan_overhang,
      slow_layer_time:        bs.slow_layer_time,
      pressure_advance:       String(_resolvePA(bs, nozzle) ?? '—'),
      flow_ratio:             String(bs.flow_ratio       ?? '—'),
      retraction_length:      `${bs.retraction_length} mm`,
      retraction_speed:       `${bs.retraction_speed} mm/s`,
    };
  }

  // ── Pre-print checklist ───────────────────────────────────────────────────────
  function getChecklist(state) {
    const items   = [];
    const mat     = getMaterial(state.material);
    const printer = getPrinter(state.printer);
    const env     = getEnv(state.environment);
    if (!mat) return items;

    // 1. Always: clean the plate
    items.push({
      text:     'Clean build plate with IPA (isopropyl alcohol)',
      detail:   'Fingerprints and grease are the #1 cause of first-layer adhesion failures.',
      critical: false,
      always:   true,
    });

    // 2. Glue if required/recommended
    const needsGlue = mat.compatible_plates.some(p => p.glue === 'required' || p.glue === 'recommended');
    const glueRequired = mat.compatible_plates.some(p => p.glue === 'required');
    if (needsGlue) {
      items.push({
        text:     glueRequired ? 'Apply glue stick to build plate (required)' : 'Apply glue stick to build plate (recommended)',
        detail:   glueRequired
          ? `${mat.name} bonds too aggressively or too weakly to bare plate — glue is required for reliable adhesion.`
          : `${mat.name} can bond too aggressively to smooth PEI — glue acts as a release agent.`,
        critical: glueRequired,
      });
    }

    // 3. Dry filament
    if (mat.drying.required) {
      items.push({
        text:     `Dry filament before printing (${mat.drying.oven_temp}°C / ${mat.drying.oven_duration_hours}h)`,
        detail:   `${mat.name} is highly moisture-sensitive — wet filament causes bubbles, stringing, and weak layers.`,
        critical: true,
      });
    } else if (mat.drying.recommended) {
      items.push({
        text:     `Dry filament if not recently opened (${mat.drying.oven_temp}°C / ${mat.drying.oven_duration_hours}h)`,
        detail:   'Filament absorbs moisture from air over time. Drying improves surface quality and layer bonding.',
        critical: false,
      });
    }

    // 4. Preheat enclosure if needed + cold environment
    const needsEnclosure = mat.enclosure_required || (mat.enclosure_behavior && mat.enclosure_behavior.enclosure_required);
    const coldEnv = state.environment === 'cold' || state.environment === 'vcold';
    const hasEnclosure = printer && printer.enclosure !== 'none';
    if (hasEnclosure && (needsEnclosure || coldEnv)) {
      const minutes = env ? (env.preheat_minutes || 15) : 15;
      items.push({
        text:     `Preheat enclosure for ${minutes} minutes before starting`,
        detail:   needsEnclosure
          ? `${mat.name} requires a warm chamber. Set bed to target temp and wait before starting the print.`
          : 'Cold environment — preheating the enclosure improves first-layer adhesion and reduces warping.',
        critical: needsEnclosure || state.environment === 'vcold',
      });
    }

    // 5. Enclosure open for PLA-type materials on enclosed printers
    const openDoorThreshold = mat.enclosure_behavior && mat.enclosure_behavior.open_door_threshold_bed_temp;
    if (openDoorThreshold != null && hasEnclosure) {
      items.push({
        text:     `Open front door + remove top glass panel`,
        detail:   `${mat.name} on an enclosed printer: keep door open to prevent heat creep when bed is above ${openDoorThreshold}°C.`,
        critical: false,
      });
    }

    // 6. AMS check for multi-color
    if (state.colors && state.colors !== 'single') {
      items.push({
        text:     'Check AMS filament path and spool seating',
        detail:   'Ensure PTFE tubes are connected, spools are correctly seated, and no tangles exist.',
        critical: false,
      });
    }

    // 7. TPU: use rear spool holder
    if (mat.group === 'TPU') {
      items.push({
        text:     'Load TPU from rear spool holder (skip AMS)',
        detail:   'TPU is too flexible to feed reliably through AMS. Load directly into the extruder from the rear spool holder.',
        critical: true,
      });
    }

    // 8. Ventilation for VOC-emitting materials
    if (mat.ventilation_required) {
      items.push({
        text:     'Ensure good room ventilation',
        detail:   `${mat.name} emits VOCs during printing. Open windows or use an air purifier. Do not print in unventilated spaces.`,
        critical: true,
      });
    }

    // 9. Bed leveling reminder
    items.push({
      text:     'Run bed leveling if first print or after moving printer',
      detail:   'Bambu printers auto-level — run it manually from the touchscreen if the printer was moved or hasn\'t been leveled recently.',
      critical: false,
    });

    // 10. Flow calibration for new filament
    items.push({
      text:     'Run flow calibration when switching filament brand or type',
      detail:   'Different brands vary in actual diameter and flow properties. Calibration ensures accurate extrusion.',
      critical: false,
    });

    return items;
  }

  // ── Warning engine ────────────────────────────────────────────────────────────
  function getWarnings(state) {
    const warnings = [];
    const printer  = getPrinter(state.printer);
    const material = getMaterial(state.material);
    const nozzle   = getNozzle(state.nozzle);
    const special  = state.special || [];
    const colors   = state.colors;
    if (!material) return warnings;

    // Helper — wrap a plain-string warning (from JSON data) as a structured object.
    function w(id, text, detail, fix) {
      return { id, text, detail: detail || '', fix: fix || '' };
    }

    // 0. CRITICAL-003 — invalid preset IDs. Mirrors the validation in
    // resolveProfile so the UI warning panel surfaces the coercion. One
    // warning per invalid field; empty/undefined is silent (matches historical
    // behavior — picker fills in defaults on first load).
    [
      ['surface',  state.surface,  _objectives.surface_quality, 'standard'],
      ['strength', state.strength, _objectives.strength_levels, 'standard'],
      ['speed',    state.speed,    _objectives.speed_priority,  'balanced'],
    ].forEach(([field, received, list, fallback]) => {
      if (!received) return;
      const valid = (list || []).some(item => item.id === received);
      if (!valid) {
        warnings.push(w('invalid_preset',
          `Unknown ${field} preset "${received}".`,
          `Using default "${fallback}" instead. Usually this means a stored setting from an older app version or a typo in a shared-URL payload.`,
          `Clear this field or pick one of the valid options in the picker.`));
      }
    });

    // 1. Material-level warnings from JSON data (plain strings)
    (material.warnings || []).forEach((msg, i) => {
      warnings.push(w(`mat_${material.id}_${i}`, msg, '', ''));
    });

    // 2. Enclosure requirement on open printer
    if (material.enclosure_required && printer && printer.enclosure === 'none') {
      warnings.push(w('enclosure_required',
        `${printer.name} is an open-frame printer.`,
        `${material.name} requires a fully enclosed printer. High warping risk — consider PLA or PETG instead.`));
    }

    // 3. PETG + open printer
    if (material.group === 'PETG' && printer && printer.enclosure === 'none') {
      warnings.push(w('petg_open_printer',
        `${printer.name} has no enclosure.`,
        'PETG prints better with stable ambient temperature. Consider a DIY enclosure or warm room to avoid layer separation.'));
    }

    // 4. PLA + passive enclosure (heat creep warning)
    if (material.group === 'PLA' && printer && printer.enclosure === 'passive' &&
        material.enclosure_behavior?.open_door_threshold_bed_temp != null) {
      warnings.push(w('pla_heat_creep',
        'PLA + enclosed printer:',
        'Open the front door and remove the top glass panel to prevent heat creep and potential clogs.'));
    }

    // 5. CF/GF material + non-hardened nozzle
    if (material.nozzle_requirements?.material === 'hardened' && nozzle && !nozzle.hardened) {
      warnings.push(w('cf_soft_nozzle',
        `Wrong nozzle for ${material.name}.`,
        'A hardened steel nozzle is required — carbon fibers will destroy standard nozzles within hours.'));
    }

    // 6. CF material + 0.2mm nozzle
    if (material.nozzle_requirements?.min_diameter > 0.2 && nozzle && nozzle.size < material.nozzle_requirements.min_diameter) {
      warnings.push(w('cf_small_nozzle',
        `Nozzle too small for ${material.name}.`,
        `Minimum ${material.nozzle_requirements.min_diameter}mm required — 0.2mm nozzle will clog immediately.`));
    }

    // 7. AMS on TPU
    if (material.group === 'TPU' && !material.ams_compatible && colors && colors !== 'single') {
      warnings.push(w('tpu_ams_incompatible',
        'TPU is not AMS compatible.',
        'Load TPU from the rear spool holder directly into the extruder.'));
    }

    // 8. Special requirement warnings
    if (special.includes('high_temp') && material.properties.heat_resistance_celsius < 70) {
      warnings.push(w('high_temp_material',
        `${material.name} softens at ~${material.properties.heat_resistance_celsius}°C.`,
        'For parts above 60°C, switch to PETG (69°C), ASA (~100°C), or ABS (~98°C).'));
    }
    if (special.includes('uv_resistant') && !material.properties.uv_resistant) {
      warnings.push(w('uv_resistance',
        'UV resistance:',
        `${material.name} degrades in prolonged sunlight. Consider ASA for outdoor applications.`));
    }
    if (special.includes('metallic') && nozzle && !nozzle.hardened) {
      warnings.push(w('metallic_soft_nozzle',
        'Metallic / abrasive filaments',
        'require a hardened steel nozzle — standard nozzles wear rapidly.'));
    }
    if (special.includes('waterproof')) {
      warnings.push(w('waterproof_settings',
        'For waterproofing:',
        'set wall loops to 4+ and infill to 60%+. PETG has better moisture and chemical resistance than PLA.'));
    }
    if (special.includes('glossy') && material.id !== 'pla_silk') {
      warnings.push(w('glossy_finish',
        'Glossy / Silk:',
        'PLA Silk produces the best gloss results. Slow outer wall to 40–50 mm/s and use fine layer height.'));
    }
    if (special.includes('matte') && material.id !== 'pla_matte') {
      warnings.push(w('matte_finish',
        'Matte finish:',
        'PLA Matte is designed for this — consider switching material for best results.'));
    }

    // 9. AMS incompatibility
    if (colors && colors !== 'single' && !material.ams_compatible) {
      warnings.push(w('ams_incompatible',
        `${material.name} is not AMS compatible.`,
        'Multi-color printing requires an AMS-compatible filament.'));
    }

    // 10. Beginner + advanced materials
    if (state.userLevel === 'beginner' && ['ABS', 'ASA', 'PVA', 'PA', 'PC'].includes(material.group)) {
      warnings.push(w('beginner_advanced_material',
        'Advanced material selected.',
        `${material.name} requires experience and specific hardware. Consider starting with PLA Basic or PETG Basic.`));
    }

    // 11. Environment warnings from JSON (plain strings)
    const env = getEnv(state.environment);
    if (env && env.warnings) {
      env.warnings.forEach((msg, i) => {
        warnings.push(w(`env_${env.id}_${i}`, msg, '', ''));
      });
    }

    // 12. Creality printer — no multi-color system
    if (printer && printer.manufacturer === 'creality' &&
        (!printer.multi_color_systems || printer.multi_color_systems.length === 0) &&
        colors && colors !== 'single') {
      warnings.push(w('creality_no_multicolor',
        `${printer.name} has no multi-color system.`,
        'This printer requires manual filament swaps for color changes. Automatic color printing is not supported.'));
    }

    // 13. K2 Plus CFS note for multi-color — different system from Bambu AMS
    if (printer && printer.id === 'k2_plus' && colors && colors !== 'single') {
      warnings.push(w('k2_plus_cfs',
        'K2 Plus uses Creality CFS, not Bambu AMS.',
        'Configure purge volumes in Creality Print software — Bambu Studio AMS settings do not apply.'));
    }

    // 14. Printer max nozzle temp too low for material
    if (printer && printer.max_nozzle_temp != null && printer.max_nozzle_temp < material.base_settings.nozzle_temp_base) {
      warnings.push(w('printer_max_nozzle_temp',
        `${printer.name} max nozzle temp is ${printer.max_nozzle_temp}°C.`,
        `${material.name} requires ${material.base_settings.nozzle_temp_base}°C minimum. An all-metal hot end upgrade is required.`));
    }

    // 14b. Printer max bed temp vs material requirements — symmetric twin of #14.
    // Soft clamp: emitted bed target gets capped by getAdvancedFilamentSettings.
    // Hard incompat: printer can't even reach the material's safe minimum bed.
    // See [CRITICAL-002].
    if (printer && printer.max_bed_temp != null && material.base_settings) {
      const bs          = material.base_settings;
      const bedAdj      = env ? (env.bed_adj || 0) : 0;
      const isPETG      = material.group === 'PETG';
      const initTarget  = bs.bed_temp_base + bedAdj + (bs.initial_layer_bed_offset || 0) + (isPETG ? 5 : 0);
      const otherTarget = bs.bed_temp_base + bedAdj;
      const highestTarget = Math.max(initTarget, otherTarget);

      if (printer.max_bed_temp < bs.bed_temp_min) {
        warnings.push(w('printer_bed_temp_incompatible',
          `${printer.name} cannot reach ${material.name}'s minimum bed temperature.`,
          `${printer.name} bed maxes at ${printer.max_bed_temp}°C, but ${material.name} requires at least ${bs.bed_temp_min}°C. This combination will not produce a usable print — choose a different material or printer.`));
      } else if (highestTarget > printer.max_bed_temp) {
        const initClamped  = initTarget  > printer.max_bed_temp;
        const otherClamped = otherTarget > printer.max_bed_temp;
        const targetNote = initClamped && !otherClamped
          ? `${bs.bed_temp_base}°C nominal (${initTarget}°C on the initial layer)`
          : `${bs.bed_temp_base}°C nominal`;
        warnings.push(w('printer_max_bed_temp_clamped',
          `${printer.name} bed temperature capped at ${printer.max_bed_temp}°C.`,
          `${material.name} typically prints best at ${targetNote}. Your printer's bed maxes at ${printer.max_bed_temp}°C, so the emitted profile clamps the bed target. Prints may warp or fail layer adhesion — consider switching to a material with a lower bed requirement.`));
      }
    }

    // 15. PA / PC + active chamber heating tip
    if (printer && printer.active_chamber_heating && ['PA', 'PC'].includes(material.group)) {
      warnings.push(w('active_chamber_heating',
        `Active chamber heating on ${printer.name} is ideal for ${material.name}.`,
        `Set chamber temp to ${material.group === 'PC' ? '45' : '40'}°C before starting — this dramatically reduces warping and delamination.`));
    }

    // 16. PA strongly recommended enclosure — on open printer
    if (material.enclosure_behavior?.enclosure_strongly_recommended && printer && printer.enclosure === 'none') {
      warnings.push(w('pa_open_printer',
        `${printer.name} is open-frame.`,
        `${material.name} warps significantly without enclosure. Use a brim of 10mm+ and print in a draught-free, warm room. Consider an enclosure upgrade.`));
    }

    // 17. Nozzle too small for material (e.g. TPU 85A requires 0.6mm+)
    if (nozzle && material.nozzle_requirements?.min_diameter && nozzle.size < material.nozzle_requirements.min_diameter) {
      warnings.push(w('nozzle_too_small',
        `${material.name} requires a ${material.nozzle_requirements.min_diameter}mm or larger nozzle.`,
        `Your selected ${nozzle.size}mm nozzle is too small — the soft material cannot generate enough pressure to flow cleanly and will clog.`));
    }

    // 18. MVS null = nozzle size not supported for this material
    if (nozzle && material.base_settings.max_mvs) {
      const mvsVal = material.base_settings.max_mvs[String(nozzle.size)];
      if (mvsVal === null) {
        warnings.push(w('nozzle_not_supported',
          `${material.name} is not recommended with a ${nozzle.size}mm nozzle.`,
          'This nozzle size is not supported for this material — use a larger nozzle (0.6mm+).'));
      }
    }

    // 19. Soft TPU + enclosed printer — heat creep risk
    if (material.id === 'tpu_85a' && printer && printer.enclosure !== 'none') {
      warnings.push(w('tpu85a_enclosure',
        `${material.name} + enclosed printer:`,
        'Keep the enclosure open or remove the top panel. Enclosed ambient heat causes heat creep with very soft TPU, leading to clogs.'));
    }
    if (material.id === 'tpu_90a' && printer && printer.enclosure === 'active_heated') {
      warnings.push(w('tpu90a_active_enclosure',
        `${material.name} + active enclosure:`,
        'Open the enclosure door during printing. Excessive ambient heat causes heat creep with soft TPU.'));
    }

    // 20. Soft TPU moisture critical reminder
    if (material.id === 'tpu_85a') {
      warnings.push(w('tpu85a_moisture',
        'TPU 85A moisture warning:',
        'This material absorbs moisture faster than any other common filament. Dry at 65°C for 8h before printing and print from a sealed dryer if possible.'));
    }

    // 21. Hygroscopic material + humid environment — critical drying warning
    if (material.base_settings.hygroscopic === 'high' && state.environment === 'humid') {
      const drying = material.drying;
      const dryInfo = drying ? ` Dry at ${drying.oven_temp}°C for ${drying.oven_duration_hours}h before printing.` : '';
      warnings.push(w('hygroscopic_humid',
        `Critical: ${material.name} is highly moisture-sensitive and you selected a humid environment.`,
        `This material must be thoroughly dried before printing — moisture causes bubbling, stringing, and weak layer adhesion.${dryInfo} Print from a sealed dryer if possible.`));
    }

    // B2. Enclosure enforcement — high shrink risk on open printer
    if (material.shrink_risk === 'high' && printer && printer.enclosure === 'none') {
      warnings.push(w('high_shrink_open',
        `${material.name} has high shrinkage risk on an open printer.`,
        'This material requires a stable enclosed environment to prevent warping and layer cracking. Use a draft shield, close nearby doors/windows, add a wide brim (8–12mm), and consider a DIY enclosure.'));
    }

    // B4. Abrasive nozzle check — abrasive material on non-hardened nozzle
    if (material.abrasive && nozzle && !nozzle.hardened) {
      warnings.push(w('abrasive_soft_nozzle',
        `${material.name} contains abrasive fillers.`,
        'This will rapidly wear a standard brass nozzle — expect visible degradation within hours of printing. Switch to a hardened steel nozzle for this material.'));
    }

    // B5. PEI adhesion alert — aggressive bonding to smooth PEI
    if (material.adhesion_risk_pei === 'high' && !state.build_plate) {
      warnings.push(w('pei_adhesion',
        `${material.name} bonds aggressively to smooth PEI.`,
        'Use a glue stick or hairspray as a release layer to prevent damage to the build plate surface. A textured PEI sheet is also a safe alternative.'));
    }

    // C1. Build plate compatibility warning
    if (state.build_plate && material.group) {
      const compat = BUILD_PLATE_COMPAT[material.group];
      if (compat) {
        const rating = compat[state.build_plate];
        const plateOption = _BUILD_PLATE_OPTIONS.find(bp => bp.id === state.build_plate);
        const plateName = plateOption ? plateOption.name : state.build_plate;
        if (rating === 'avoid') {
          const note = BUILD_PLATE_NOTES[state.build_plate]?.avoid || `${material.name} is not recommended on ${plateName}.`;
          warnings.push(w('build_plate_avoid',
            `${material.name} + ${plateName}: Not recommended.`,
            note));
        } else if (rating === 'needs_prep') {
          const note = BUILD_PLATE_NOTES[state.build_plate]?.needs_prep || `${plateName} requires surface preparation for ${material.name}.`;
          warnings.push(w('build_plate_prep',
            `${material.name} + ${plateName}: Prep required.`,
            note));
        }
      }
    }

    // C2. Filament condition — unknown + hygroscopic material
    if (state.filament_condition === 'unknown' && material.base_settings.hygroscopic && material.base_settings.hygroscopic !== 'none') {
      const drying = material.drying;
      const dryInfo = drying ? ` Dry at ${drying.oven_temp}°C for ${drying.oven_duration_hours}h before printing.` : '';
      warnings.push(w('filament_condition_unknown',
        `Filament condition unknown for ${material.name}.`,
        `This material is moisture-sensitive — if you haven't dried it recently, print quality may suffer.${dryInfo}`));
    }

    // C3. (was layer-height-too-tall — replaced by C5 clamp notice below, which
    // both flags the condition AND tells the user the engine already clamped the
    // emitted value to printer max. Keeping the C5 message is more accurate than
    // asking the user to pick a different surface when the clamp already handled it.)

    // C4. Bowden extruder info warning — fires for explicit user override OR
    // for printers whose built-in extruder_type is bowden (e.g. Prusa MINI+).
    const effectiveExtruder = state.extruder_type || (printer && printer.extruder_type) || 'direct_drive';
    if (effectiveExtruder === 'bowden') {
      warnings.push(w('bowden_extruder',
        state.extruder_type === 'bowden' ? 'Bowden extruder selected.' : `${printer.name} uses a bowden extruder.`,
        'Retraction distances are increased to compensate for the longer filament path. Fine-tune based on your PTFE tube length.'));
    }

    // C5. Printer-capability clamping notices (IMPL-039)
    // Informs the user when an emitted value was reduced because their printer's
    // firmware / slicer can't accept the raw value from the objective profile.
    // Intentionally appended last so clamps appear below more critical warnings.
    if (printer && nozzle) {
      const lim = getPrinterLimits(printer, nozzle.size);
      if (lim) {
        // Layer height clamp notice — fires when Draft+0.4mm scenarios etc. get reduced
        if (state.surface) {
          const surf = getSurface(state.surface);
          if (surf && surf.layer_height > lim.max_layer_height + 1e-6) {
            warnings.push(w('layer_height_clamped',
              `Layer height reduced to ${lim.max_layer_height} mm for ${printer.name}.`,
              `${surf.name} normally uses ${surf.layer_height} mm, but the slicer's printer-level ceiling for a ${nozzle.size} mm nozzle is ${lim.max_layer_height} mm. A taller layer would be rejected on import.`));
          }
        }
        // Speed clamp notice — fires when default speeds exceed printer firmware cap
        const speedMode = getSpeedMode(state.speed);
        if (speedMode) {
          const isCoreXY = printer.series === 'corexy';
          const rawOuter = isCoreXY ? speedMode.outer_corexy : speedMode.outer_bedslinger;
          if (rawOuter > lim.max_outer_wall_speed + 1e-6) {
            warnings.push(w('outer_wall_speed_clamped',
              `Outer wall speed capped at ${lim.max_outer_wall_speed} mm/s for ${printer.name}.`,
              `Your speed preset requested ${rawOuter} mm/s but ${printer.name}'s firmware limit is ${printer.max_speed} mm/s, so the safe outer-wall cap is ${lim.max_outer_wall_speed} mm/s.`));
          }
        }
      }
    }

    // C6. Slicer pattern substitution notices (IMPL-039)
    // When a strength / support / surface pattern isn't supported by the user's
    // slicer and mapForSlicer has substituted a fallback, tell the user so they
    // know what they're actually getting (e.g. Prusa users on Minimal strength
    // see "Rectilinear" instead of "Cross Hatch").
    //
    // [HIGH-008] Coverage extended from { sparse_infill, support_interface } to
    // every `patternFor`-routed field. Previously top/bottom/internal/seam
    // patterns silently substituted via mapForSlicer's `validSet[0]` fallback
    // with no user-visible trace. Checks is now the canonical list — any new
    // patternFor field MUST be added here to preserve coverage.
    if (printer && _slicerCaps) {
      const slicer = getSlicerForPrinter(state.printer) || 'bambu_studio';
      // Mirror resolveProfile's preset coercion — unknown surface ID falls back
      // to 'standard' so isFineQuality stays well-defined under CRITICAL-003 invalid input.
      const surface = getSurface(state.surface) || getSurface('standard');
      const isFineQuality = surface && (surface.id === 'fine' || surface.id === 'maximum');
      const seamLabels = { aligned: 'Aligned', sharpest_corner: 'Sharpest corner', random: 'Random', back: 'Back' };
      // Only check seam_position when the user explicitly picked one — the engine's
      // default display "Aligned (or Back)" is a composite hint, not a slicer candidate,
      // and always reduces to the slicer default (noise, not substitution).
      const checks = [
        { label: 'Sparse infill pattern',             field: 'sparse_infill_pattern',           value: getStrength(state.strength)?.infill_pattern },
        { label: 'Support interface pattern',         field: 'support_interface_pattern',       value: state.support === 'best_underside' ? 'Grid' : (state.support && state.support !== 'none' ? 'Rectilinear' : null) },
        { label: 'Top surface pattern',               field: 'top_surface_pattern',             value: isFineQuality ? 'Monotonic line' : 'Monotonic' },
        { label: 'Bottom surface pattern',            field: 'bottom_surface_pattern',          value: 'Monotonic' },
        { label: 'Internal solid infill pattern',     field: 'internal_solid_infill_pattern',   value: 'Rectilinear' },
        { label: 'Seam position',                     field: 'seam_position',                   value: state.seam ? (seamLabels[state.seam] || state.seam) : null },
      ];
      checks.forEach(c => {
        if (!c.value) return;
        const mapped = mapForSlicer(c.value, c.field, slicer);
        const norm = s => String(s).toLowerCase().trim().replace(/[\s_-]+/g, '');
        if (norm(mapped) !== norm(c.value)) {
          warnings.push(w(`pattern_substituted_${c.field}`,
            `${c.label} substituted for ${slicer.replace(/slicer$/, 'Slicer')}.`,
            `Your preset uses "${c.value}" — not available in your slicer. Emitted "${mapped}" as the closest equivalent.`));
        }
      });
    }

    return warnings;
  }

  // ── Main profile resolver ─────────────────────────────────────────────────────
  function resolveProfile(state) {
    const printer   = getPrinter(state.printer);
    const material  = getMaterial(state.material);
    const nozzle    = getNozzle(state.nozzle);
    // [MEDIUM-002] Require all three inputs — nozzle was previously allowed to
    // fall through and silently defaulted nozzleSize to 0.4, producing a profile
    // for a hypothetical 0.4mm setup. Inconsistent with exportBambuStudioJSON
    // which already rejects on missing nozzle.
    if (!printer || !material || !nozzle) return {};

    // CRITICAL-003 — validate preset IDs against canonical sets. Empty/undefined
    // passes through unchanged (historical behavior). Truthy-but-unknown IDs
    // (stale localStorage, typo'd share-URL, legacy client) coerce to the
    // documented default instead of silently emitting `undefined` downstream.
    // getWarnings replicates this validation to emit `invalid_preset` — the two
    // functions stay pure of each other, same pattern as CRITICAL-002 bed-temp.
    const _hasPresetId = (list, id) => !id || (list || []).some(item => item.id === id);
    const surfaceId  = _hasPresetId(_objectives.surface_quality, state.surface)  ? state.surface  : 'standard';
    const strengthId = _hasPresetId(_objectives.strength_levels, state.strength) ? state.strength : 'standard';
    const speedId    = _hasPresetId(_objectives.speed_priority,  state.speed)    ? state.speed    : 'balanced';

    const surface   = getSurface(surfaceId);
    const strength  = getStrength(strengthId);
    const speedMode = getSpeedMode(speedId);
    const env       = getEnv(state.environment);

    const useCase  = state.useCase  || [];
    const special  = state.special  || [];

    const isCoreXY     = printer.series === 'corexy';
    const isPETG       = material.group === 'PETG';
    const isTPU        = material.group === 'TPU';
    const isABSlike    = ['ABS', 'ASA'].includes(material.group);
    const isPA         = material.group === 'PA';
    const isPC         = material.group === 'PC';
    const isEngineering = isPC || isPA;
    const isFunctional = useCase.includes('functional');
    const isMiniature  = useCase.includes('miniature');
    const isLarge      = useCase.includes('large');
    const isPrototype  = useCase.includes('prototype');
    const nozzleSize   = nozzle ? nozzle.size : 0.4;
    const isBeginnerMode = state.userLevel === 'beginner';

    // Printer capability limits for this nozzle — drives value clamping below
    // so emitted values never exceed what the printer's slicer actually accepts.
    const limits = getPrinterLimits(printer, nozzleSize);

    // Target slicer for this printer — drives pattern/generator substitution so
    // Prusa users don't see "Cross Hatch" (Bambu-only) in their profile.
    const slicer = getSlicerForPrinter(state.printer) || 'bambu_studio';

    // Helper: make a displayable pattern name slicer-correct.
    // _slicerCaps stores lowercase value sets; we preserve/capitalize for UI display.
    const _capitalize = s => typeof s !== 'string' ? s
      : s.split(/(\s|[_-])/).map(part => /^[a-z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part).join('');
    const patternFor = (value, field) => _capitalize(mapForSlicer(value, field, slicer));

    const p = {};

    // ─── QUALITY TAB ──────────────────────────────────────────────────────────
    if (surface) {
      // Clamp layer_height to printer max (e.g. 0.4mm nozzle → Bambu max 0.28)
      // [MEDIUM-004] _fmtLayer keeps this in lockstep with the chip desc on edge floats.
      const lh = limits ? _clampNum(surface.layer_height, limits.min_layer_height, limits.max_layer_height) : surface.layer_height;
      p.layer_height = S(`${_fmtLayer(lh)} mm`,
        surface.id === 'draft'   ? 'Thick layers reduce total layer count significantly. Ideal for prototypes where surface finish is secondary.' :
        surface.id === 'maximum' ? 'Finest layer height. Combined with ironing produces a near-smooth top surface.' :
        surface.id === 'fine'    ? 'Fine layers visibly reduce the staircase effect on curved and angled surfaces.' :
                                   'Standard balance of print time and surface quality for everyday parts.');

      const useArachne = surface.wall_generator === 'Arachne' || isMiniature;
      p.wall_generator = S(
        useArachne ? 'Arachne' : 'Classic',
        useArachne
          ? 'Arachne uses variable-width extrusion to fill thin walls and fine details that Classic would leave partially empty.'
          : 'Classic produces consistent, predictable wall widths — better for structural parts.');

      // Seam position — explicit state.seam overrides surface default
      // patternFor translates our UI-canonical forms (e.g. "Sharpest corner") to
      // the target slicer's equivalent (e.g. Prusa uses "Rear" instead of "Back",
      // all slicers use "Nearest" for what we call "Sharpest corner").
      const seamLabels = { aligned: 'Aligned', sharpest_corner: 'Sharpest corner', random: 'Random', back: 'Back' };
      if (state.seam && state.seam !== 'aligned') {
        p.seam_position = S(patternFor(seamLabels[state.seam] || state.seam, 'seam_position'),
          state.seam === 'sharpest_corner' ? 'Seam placed at the sharpest corner of each layer — hides it in geometry.' :
          state.seam === 'random'          ? 'Seam placed randomly each layer — spreads the mark across the surface instead of concentrating it.' :
          state.seam === 'back'            ? 'Seam placed at the back of the model — keeps the visible side clean.' : '');
      } else if (surface.seam_aligned) {
        p.seam_position = S(patternFor('Aligned (or Back)', 'seam_position'),
          'At fine quality, the seam is more visible. Placing it consistently at one location makes it easy to hide or orient away from view.');
      }

      // Initial layer height scales with nozzle so tiny nozzles (0.2mm, max layer ~0.14)
      // don't emit an illegal 0.20 value that every slicer would reject on import, and
      // large nozzles (0.6/0.8mm) get a first-layer thick enough to bond reliably.
      // Then clamped against the printer's actual max_layer_height as a belt-and-suspenders.
      let initLayerH = Math.max(0.12, Math.min(nozzleSize * 0.5, 0.32));
      if (limits) initLayerH = _clampNum(initLayerH, limits.min_layer_height, limits.max_layer_height);
      p.initial_layer_height = A(`${initLayerH.toFixed(2)} mm`,
        'A slightly thicker initial layer improves bed adhesion. Scales with nozzle size — small nozzles use thinner first layers, large nozzles use thicker ones.');

      // Line widths: nozzle × 1.05/1.10, clamped against printer's max_line_width
      // (protects users of 0.8mm+ nozzles whose printers may cap line width tighter).
      let ow = nozzleSize * 1.05;
      let iw = nozzleSize * 1.10;
      if (limits) {
        ow = _clampNum(ow, null, limits.max_line_width);
        iw = _clampNum(iw, null, limits.max_line_width);
      }
      p.outer_wall_line_width  = A(`${ow.toFixed(2)} mm`, 'Slightly wider than nozzle diameter — improves surface quality and wall strength with minimal speed penalty.');
      p.inner_wall_line_width  = A(`${iw.toFixed(2)} mm`, 'Wider inner walls print faster while maintaining structural integrity.');
      p.top_surface_line_width = A(`${ow.toFixed(2)} mm`, 'Matching the outer wall width gives a consistent, uniform top surface appearance.');

      p.arc_fitting = A('Enabled',
        'Converts thousands of short linear segments into smooth arc moves (G2/G3). Reduces vibration and improves surface quality on circular features.');

      p.avoid_crossing_walls = A('Enabled',
        'Routes travel moves around printed walls rather than through them. Reduces the risk of seam blobs and surface zits from ooze during travel.');

      if (surface.id === 'fine' || surface.id === 'maximum') {
        p.only_one_wall_top = A('Enabled',
          'Using a single outer wall on top layers reduces the gaps between adjacent wall lines, producing a smoother and more uniform top surface.');
      }

      if (isPETG) {
        p.bridge_flow = A('0.90',
          'Slight under-extrusion on bridges reduces sagging — PETG is particularly prone to bridge droop at full flow.');
      }
    }

    if (isFunctional) {
      p.order_of_walls = S('Inner / Outer',
        'Inner walls are placed first, establishing the reference geometry. The outer wall is then placed precisely against them — improving hole and feature accuracy.');
      p.xy_hole_compensation = S('0.05–0.1 mm',
        'Compensates for material expansion that makes holes slightly smaller than designed. Start at 0.05 mm and adjust with a test print.');
      p.elephant_foot_compensation = S('0.15 mm',
        'Prevents the over-squeezed first layer from widening the base and affecting dimensional accuracy of features close to the bed.');
    }

    // ─── STRENGTH TAB ─────────────────────────────────────────────────────────
    if (strength) {
      p.wall_loops = S(`${strength.wall_loops}`,
        strength.wall_loops >= 4
          ? 'Walls contribute more to strength than infill. Going from 2 to 4 walls often doubles part strength at lower cost than raising infill.'
          : strength.wall_loops <= 2
            ? 'Minimum walls for structural integrity. Suitable for prototypes and non-load-bearing parts.'
            : 'Standard wall count — good balance of strength, weight, and print time.');

      const infillPat = patternFor(strength.infill_pattern, 'sparse_infill_pattern');
      p.sparse_infill_pattern = S(infillPat,
        strength.infill_pattern === 'Gyroid'
          ? 'Gyroid provides uniform strength in all three axes. The nozzle never crosses existing infill lines in the same layer, reducing pressure spikes.'
          : strength.infill_pattern === 'Grid'
            ? 'Grid is efficient and strong in the XY plane. A solid default for most everyday parts.'
            : 'Cross Hatch is the fastest infill to print. Adequate for prototypes where strength is not the priority.');

      p.sparse_infill_density = S(`${strength.infill_density}%`,
        strength.infill_density >= 40
          ? 'High infill for maximum rigidity — significantly increases weight and print time.'
          : strength.infill_density <= 10
            ? 'Low infill keeps the part lightweight and fast to print. Adequate for non-structural use.'
            : 'Balanced infill — enough internal structure for everyday parts without excessive material use.');

      const lowInfill  = strength.infill_density <= 15;
      const fineLayers = surface && surface.layer_height <= 0.15;
      const topShells  = fineLayers ? 6 : lowInfill ? 5 : (strength.top_shell_layers_base || 5);
      p.top_shell_layers = S(`${topShells}`,
        topShells >= 5
          ? 'More top shells prevent pillowing (small holes in the top face) — common at low infill densities or with fine layer heights.'
          : 'Standard top shell count — enough layers to produce a solid, closed top surface.');

      const bottomShells = strength.bottom_shell_layers_base || Math.max(3, topShells - 1);
      p.bottom_shell_layers = A(`${bottomShells}`,
        'Solid bottom shells form the base of the print. More shells improve the first-layer surface quality visible on the underside.');

      const isFineQuality = surface && (surface.id === 'fine' || surface.id === 'maximum');
      p.top_surface_pattern = A(
        patternFor(isFineQuality ? 'Monotonic line' : 'Monotonic', 'top_surface_pattern'),
        'Monotonic line produces the smoothest top surface — each line always starts where the previous ended, eliminating gaps and improving gloss.');

      p.bottom_surface_pattern       = A(patternFor('Monotonic', 'bottom_surface_pattern'), 'Monotonic bottom surface pattern ensures complete coverage on the first visible layers.');
      p.internal_solid_infill_pattern = A(patternFor('Rectilinear', 'internal_solid_infill_pattern'), 'Rectilinear is the fastest pattern for solid infill — the slicer alternates line direction per layer automatically.');

      if (speedMode?.id === 'fast' || isPrototype) {
        p.infill_combination = A('Enabled',
          'Combines infill from multiple layers into one pass. Significantly reduces print time with minimal strength impact on non-structural parts.');
      }
    }

    // ─── SPEED TAB ────────────────────────────────────────────────────────────
    if (speedMode) {
      const sm = speedMode;

      // Base speeds from objective profile
      let outerSpeed = isCoreXY ? sm.outer_corexy : sm.outer_bedslinger;
      let innerSpeed = isCoreXY ? sm.inner_corexy : sm.inner_bedslinger;

      // TPU speed cap — per-material max_speed (85A=20, 90A=30, 95A=60)
      if (isTPU) {
        const tpuMax = material.base_settings.max_speed || 40;
        outerSpeed = Math.min(outerSpeed, tpuMax);
        innerSpeed = Math.min(innerSpeed, Math.round(tpuMax * 1.25));
      }

      // ABS/ASA: moderate cap for warp prevention
      if (isABSlike) {
        outerSpeed = Math.min(outerSpeed, 60);
        innerSpeed = Math.min(innerSpeed, 100);
      }

      // PC: slow outer wall essential for layer adhesion at high temps
      if (isPC) {
        outerSpeed = Math.min(outerSpeed, 40);
        innerSpeed = Math.min(innerSpeed, 60);
      }

      // PA: moderate cap — Nylon needs time to bond between layers
      if (isPA) {
        outerSpeed = Math.min(outerSpeed, 50);
        innerSpeed = Math.min(innerSpeed, 80);
      }

      // MVS speed cap from material JSON data (per-nozzle max_mvs)
      const mat_bs = material.base_settings;
      const layerH = surface ? surface.layer_height : 0.2;
      if (mat_bs.max_mvs && nozzle) {
        const mvsStr = mat_bs.max_mvs[String(nozzleSize)];
        if (mvsStr) {
          const mvs = parseFloat(mvsStr);
          const defaultLineWidth = nozzleSize * 1.05;
          const mvsSpeedCap = Math.floor(mvs / (defaultLineWidth * layerH));
          outerSpeed = Math.min(outerSpeed, mvsSpeedCap);
          innerSpeed = Math.min(innerSpeed, Math.floor(mvsSpeedCap * 1.4));
        }
      }

      // Global max_volumetric_speed cap (material-level, nozzle-agnostic)
      if (mat_bs.max_volumetric_speed && nozzle) {
        const crossSection = nozzleSize * layerH;
        const globalMvsCap = Math.floor(mat_bs.max_volumetric_speed / crossSection);
        if (outerSpeed > globalMvsCap || innerSpeed > globalMvsCap) {
          outerSpeed = Math.min(outerSpeed, globalMvsCap);
          innerSpeed = Math.min(innerSpeed, Math.floor(globalMvsCap * 1.4));
        }
      }

      // PETG outer wall cap for surface quality
      const petgCapped = isPETG && outerSpeed > 80;
      if (petgCapped) outerSpeed = 80;

      // Beginner safety: cap at 80% of calculated speed
      if (isBeginnerMode) {
        outerSpeed = Math.round(outerSpeed * 0.8);
        innerSpeed = Math.round(innerSpeed * 0.8);
      }

      // Final printer capability clamp — catches edge cases where the emitted
      // speed exceeds what this specific printer's firmware accepts (e.g.
      // Ender 3 V3 SE at max_speed=250 vs a default outer_bedslinger=100).
      if (limits) {
        outerSpeed = Math.round(_clampNum(outerSpeed, null, limits.max_outer_wall_speed));
        innerSpeed = Math.round(_clampNum(innerSpeed, null, limits.max_inner_wall_speed));
      }

      p.outer_wall_speed = S(`${outerSpeed} mm/s`,
        isTPU      ? 'TPU must print slowly — flexible filament stretches during fast moves causing under-extrusion and jams.' :
        isABSlike  ? 'Slower outer walls reduce warping risk by allowing each layer more time to cool gradually.' :
        // HIGH-012 — template against printer.name + printer.max_acceleration so
        // MK4 / MK4S / Ender-3 V3 / Kobra / Mini+ don't see text naming "A1/A1 Mini".
        !isCoreXY  ? `${printer.name} tops out at ${(printer.max_acceleration || 0).toLocaleString('en-US')} mm/s² acceleration — higher outer-wall speeds cause ringing on tall prints.` :
        petgCapped ? 'PETG surface quality degrades noticeably above 80 mm/s outer wall speed — capped for this material.' :
        sm.id === 'quality' ? 'Slow outer walls reduce vibration artifacts and give each layer more time to solidify uniformly.' :
        'Outer wall speed balanced for your printer type — CoreXY handles higher speeds without ringing.');

      p.inner_wall_speed = S(`${innerSpeed} mm/s`,
        isTPU     ? 'Inner walls also capped for flexible filament — consistent flow matters more than speed.' :
        isABSlike ? 'Moderate inner wall speed helps ABS/ASA cool uniformly between layers.' :
        !isCoreXY ? 'Bedslinger printers benefit from lower inner wall speeds to reduce ringing on taller prints.' :
        'Inner walls are hidden — higher speed than outer walls trades invisible quality for faster prints.');

      // Advanced speed settings
      let initSpeed = isCoreXY ? sm.initial_layer : (sm.initial_layer - 5);
      if (isTPU)    initSpeed = Math.min(initSpeed, Math.round((material.base_settings.max_speed || 40) * 0.5));
      if (isABSlike) initSpeed = Math.min(initSpeed, 25);
      const initSpeedFinal = env ? Math.round(initSpeed * (env.first_layer_speed_multiplier || 1.0)) : initSpeed;

      p.initial_layer_speed = A(`${initSpeedFinal} mm/s`,
        'Slow initial layer speed gives the filament more time to bond with the bed surface and build a solid foundation.');

      const topSpeed = isCoreXY ? sm.top_surface_corexy : sm.top_surface_bedslinger;
      p.top_surface_speed = A(`${topSpeed} mm/s`,
        sm.id === 'quality' ? 'Slow top surface speed produces the most uniform and flat top layer — critical when ironing is enabled.' :
        'Top surface speed tuned for your printer — slower than inner walls since this layer is visible.');

      const gapSpeed = isCoreXY ? sm.gap_fill_corexy : sm.gap_fill_bedslinger;
      p.gap_fill_speed = A(`${gapSpeed} mm/s`,
        'Gap fill handles small spaces between walls. Moderate speed prevents pressure buildup and ooze in tight gaps.');

      // Accelerations
      let outerAccel = isCoreXY
        ? (isPETG || isABSlike ? Math.round(sm.outer_accel_corexy * 0.6) : sm.outer_accel_corexy)
        : sm.outer_accel_bedslinger;
      let innerAccel = isCoreXY
        ? (isPETG || isABSlike ? Math.round(sm.inner_accel_corexy * 0.6) : sm.inner_accel_corexy)
        : sm.inner_accel_bedslinger;
      const initAccel = sm.initial_accel;

      if (isTPU) {
        const tpuMax = material.base_settings.max_speed || 40;
        const accelCap = tpuMax <= 20 ? 300 : tpuMax <= 30 ? 400 : 500;
        outerAccel = Math.min(outerAccel, accelCap);
        innerAccel = Math.min(innerAccel, Math.round(accelCap * 1.6));
      }

      p.outer_wall_acceleration    = A(`${outerAccel} mm/s²`,
        isTPU     ? 'Very low acceleration for TPU — prevents filament stretching and under-extrusion.' :
        // [HIGH-012-followup A] Template against printer.name — was hardcoded "A1/A1 Mini" and fired for every bedslinger.
        !isCoreXY ? `Lower acceleration on ${printer.name} prevents ringing from the moving print bed mass.` :
        isABSlike ? 'Reduced acceleration helps ABS/ASA cool more uniformly, reducing warping.' :
        'Outer wall acceleration tuned for your printer — balances speed with surface quality.');
      p.inner_wall_acceleration    = A(`${innerAccel} mm/s²`,
        isTPU     ? 'Low acceleration for flexible filament — matches outer wall limits to prevent jams.' :
        !isCoreXY ? 'Reduced acceleration for bedslinger — inner walls still contribute to visible ringing.' :
        isABSlike ? 'Lower acceleration helps ABS/ASA maintain consistent layer bonding.' :
        'Higher than outer wall — inner walls are hidden so acceleration artifacts are not visible.');
      p.initial_layer_acceleration = A(`${initAccel} mm/s²`,
        'Very low acceleration ensures the nozzle moves smoothly at slow speed — prevents the first layer from being dragged or lifting at corners.');
    }

    // ─── SUPPORT TAB ──────────────────────────────────────────────────────────
    const support = _SUPPORT_TYPES.find(s => s.id === state.support);
    if (support && support.id !== 'none') {
      const isTree = support.id === 'easy' || support.id === 'balanced';
      const forceEasy = isBeginnerMode;
      // [LOW-010] Z-gap reads directly from the unified _SUPPORT_TYPES entry —
      // the `support.id !== 'none'` guard above ensures support.z_gap is set.
      // Previous `|| '0.10'` silent fallback deleted: a new id added to the
      // table without geometry now throws at emission time instead of silently
      // emitting wrong support output. IMPL-040.
      const zGap = support.z_gap;

      p.support_type            = S(isTree || forceEasy ? 'Tree' : 'Normal',
        isTree || forceEasy
          ? 'Tree supports contact the model at minimal points and are significantly easier to remove without surface damage.'
          : 'Normal supports provide better surface quality on the underside of supported areas — use when finish matters.');
      p.support_style           = S(isTree || forceEasy ? 'Tree Hybrid' : 'Default',
        isTree || forceEasy
          ? 'Hybrid combines tree and normal support — tree branches where possible, normal on flat overhangs.'
          : 'Default support style — grid pattern provides reliable support for all overhang types.');
      p.support_threshold_angle = S(support.id === 'best_underside' ? '30°' : '40°',
        'Only generate support where overhangs exceed this angle. Lower values generate more support — use 30° for quality-critical surfaces.');
      p.support_z_distance      = S(`${zGap} mm`,
        support.id === 'easy'
          ? 'Large Z gap makes support very easy to snap off. Minimal surface marks.'
          : support.id === 'balanced'
          ? 'Moderate Z gap balances ease of removal with reasonable underside quality.'
          : 'Tight Z distance produces the cleanest supported surfaces at the cost of harder removal.');

      p.support_interface_layers  = A(support.id === 'best_underside' ? '3' : '2',
        'Interface layers are solid layers between the support and model surface — more layers = better surface finish on the supported face, but harder to remove.');
      p.support_interface_pattern = A(patternFor(support.id === 'best_underside' ? 'Grid' : 'Rectilinear', 'support_interface_pattern'),
        'Grid interface provides stronger contact with the model surface. Rectilinear is easier to peel off after printing.');
    }

    // ─── OTHERS TAB ───────────────────────────────────────────────────────────
    const colors = state.colors;
    if (colors && colors !== 'single') {
      p.prime_tower = S('Enabled',
        'Prime tower purges leftover filament from the previous color before printing each new color layer — prevents color contamination.');
      if (colors === 'multi_5') {
        p.flush_into_infill = S('Enabled',
          'Flushes purge material into the infill rather than the prime tower — saves time and material on high color-count prints.');
      }
    }

    // Ironing — decoupled from surface quality, driven by state.ironing (auto/on/off)
    const ironingState = state.ironing || 'auto';
    const ironingEnabled = ironingState === 'on' ||
      (ironingState === 'auto' && surface && ['fine', 'maximum', 'very_fine', 'ultra'].includes(surface.id));
    if (ironingEnabled) {
      p.ironing = S('Enabled — Monotonic line',
        ironingState === 'auto'
          ? 'Auto-enabled at Fine or better surface quality. Ironing re-passes the nozzle over the top surface to produce a near-smooth finish.'
          : 'Ironing re-passes the nozzle over the top surface at low speed to melt and flatten bumps, producing a near-glossy flat finish.');
    }

    if (isLarge && !isCoreXY) {
      p.slow_down_tall = S('Enabled (recommended)',
        // [HIGH-012-followup B] Template against printer.name — was hardcoded "A1/A1 Mini" and fired for every bedslinger large-print case.
        `On ${printer.name} the bed moves — tall prints amplify vibration as mass increases. Slowing top layers significantly reduces ringing artifacts.`);
    }

    // Brim logic — explicit state.brim overrides auto-detection
    const brimState = state.brim || 'auto';
    if (brimState !== 'none') {
      let brimValue, brimWhy;
      if (brimState === 'auto') {
        // Auto: decide based on material + use case
        const highShrink = material.shrink_risk === 'high';
        const needsBrim = isFunctional || isLarge || special.includes('high_temp') || isBeginnerMode || isABSlike || isPA || isPC || highShrink;
        if (needsBrim) {
          brimValue = (isPA || isPC || highShrink) ? '8–12 mm' : '5–8 mm';
          brimWhy = isPC         ? 'PC shrinks significantly — a wide brim is essential to prevent corner lift and delamination.' :
                    isPA         ? 'PA (Nylon) has high shrinkage — always use a brim to prevent warping, especially on larger parts.' :
                    isABSlike    ? 'Essential for ABS/ASA — these materials warp severely at corners without a brim.' :
                    highShrink   ? `${material.name} has high shrink risk — auto-brim applied to prevent warping.` :
                    isBeginnerMode ? 'Beginner tip: a brim dramatically improves first-layer success rate for any material.' :
                    'A brim prevents corners and thin features from lifting off the bed during printing.';
        }
      } else if (brimState === 'small') {
        brimValue = '5 mm';
        brimWhy = 'Small brim — minimal bed adhesion boost without excessive cleanup.';
      } else if (brimState === 'large') {
        brimValue = '10 mm';
        brimWhy = 'Large brim — maximum adhesion for warp-prone materials and large parts.';
      } else if (brimState === 'mouse_ears') {
        brimValue = 'Mouse ears (corners only)';
        brimWhy = 'Brim applied only to corners — prevents lifting while minimizing cleanup.';
      }
      if (brimValue) {
        p.brim_width = A(brimValue, brimWhy);
      }
    }

    // ─── RETRACTION & PRESSURE ADVANCE (from material data) ───────────────────
    const mbs = material.base_settings;

    // Resolve effective extruder type — user override via state.extruder_type takes
    // precedence, else fall back to the printer's built-in type (so MINI+ / other
    // bowden-native printers automatically get bowden retraction without the user
    // having to tick the optional filter).
    const effectiveExtruder = state.extruder_type || printer.extruder_type || 'direct_drive';

    // Retraction emission — nozzle-scaled (base value assumes 0.4mm direct-drive).
    // Small nozzles need less retraction (less melt in the nozzle path); large nozzles
    // need more. Scaling factor: sqrt(nozzleSize / 0.4), clamped to material.retraction_max.
    // Bowden extruders multiply further (×1.5–3.5) on top. Final value is also clamped
    // against retraction_max to keep flexibles safe.
    const _scaleRetraction = (base) => {
      if (base == null) return null;
      const nzFactor = Math.sqrt(Math.max(0.2, nozzleSize) / 0.4);
      let rd = Math.round(base * nzFactor * 10) / 10;
      if (effectiveExtruder === 'bowden') {
        const mult = material.flexible ? 1.5 : 3.5;
        rd = Math.round(rd * mult * 10) / 10;
      }
      if (material.retraction_max != null) rd = Math.min(rd, material.retraction_max);
      return rd;
    };

    if (mbs.retraction_distance != null) {
      const rd = _scaleRetraction(mbs.retraction_distance);
      const isBowden = effectiveExtruder === 'bowden';
      const isScaled = Math.abs(rd - mbs.retraction_distance) > 1e-6;
      p.retraction_distance = S(`${rd} mm`,
        isBowden
          ? (material.flexible
              ? `Bowden retraction for flexible filament — modest increase to avoid grinding. Scaled for ${nozzleSize}mm nozzle. Fine-tune based on tube length.`
              : `Bowden retraction increased to compensate for the longer PTFE tube path. Scaled for ${nozzleSize}mm nozzle. Fine-tune based on tube length.`)
          : (isTPU
              ? 'Very short retraction for flexible filament — longer retractions cause jams in the extruder.'
              : (isScaled
                  ? `Retraction scaled for ${nozzleSize}mm nozzle (base ${mbs.retraction_distance}mm for 0.4mm) — small nozzles need less, large nozzles need more.`
                  : (rd >= 1.0 ? 'Longer retraction to prevent ooze with this high-temp material.' : 'Standard retraction distance for this material.'))));
    }

    if (mbs.retraction_speed != null) {
      p.retraction_speed = S(`${mbs.retraction_speed} mm/s`,
        isTPU ? 'Slow retraction prevents stretching and grinding of flexible filament.' :
        'Retraction speed tuned for this material\'s melt characteristics.');
    }

    const paVal = _resolvePA(mbs, nozzle);
    if (paVal != null) {
      p.pressure_advance = A(`${paVal}`,
        `Pressure advance (K-factor) calibrated for ${nozzleSize}mm nozzle. Fine-tune with a PA calibration test print.`);
    }

    // B1. Fan policy output — base fan speed recommendation from material data
    const fanMap = { high: '100%', moderate: '50%', low: '25%', off: '0%' };
    if (material.fan_policy && fanMap[material.fan_policy]) {
      p.fan_speed = S(fanMap[material.fan_policy],
        material.fan_policy === 'off'      ? 'Fan off — this material needs slow, even cooling to prevent warping and layer cracking.' :
        material.fan_policy === 'moderate'  ? 'Moderate fan — balances cooling for dimensional accuracy without causing adhesion issues.' :
        material.fan_policy === 'high'      ? 'Full fan speed — rapid cooling locks in detail and prevents sagging on overhangs.' :
        'Low fan speed — minimal cooling to maintain layer adhesion.');
    }

    return p;
  }

  // ── Nozzle × material compatibility check ────────────────────────────────────
  function isNozzleCompatibleWithMaterial(nozzleId, materialId) {
    const nozzle   = getNozzle(nozzleId);
    const material = getMaterial(materialId);
    if (!nozzle || !material) return { ok: true, warnings: [] };
    const w = [];
    if (material.nozzle_requirements?.material === 'hardened' && !nozzle.hardened) {
      w.push(`${material.name} requires a hardened steel nozzle.`);
    }
    if (nozzle.size < (material.nozzle_requirements?.min_diameter || 0)) {
      w.push(`${material.name} requires a minimum nozzle size of ${material.nozzle_requirements.min_diameter}mm.`);
    }
    return { ok: w.length === 0, warnings: w };
  }

  // ── Nozzle filtering by material compatibility ───────────────────────────────
  function getCompatibleNozzles(materialId) {
    if (!materialId) return _nozzles.map(n => ({ id: n.id, name: n.name, compatible: true }));
    const material = getMaterial(materialId);
    if (!material) return _nozzles.map(n => ({ id: n.id, name: n.name, compatible: true }));
    return _nozzles.map(n => {
      const { ok } = isNozzleCompatibleWithMaterial(n.id, materialId);
      const mvsVal = material.base_settings.max_mvs?.[String(n.size)];
      const mvsBlocked = mvsVal === null;
      return { id: n.id, name: n.name, compatible: ok && !mvsBlocked };
    });
  }

  // ── Profile export ───────────────────────────────────────────────────────────

  // Bambu Studio field mapping: engine param ID → BS JSON field name
  const BAMBU_PROCESS_MAP = {
    layer_height:              'layer_height',
    initial_layer_height:      'initial_layer_print_height',
    wall_generator:            'wall_generator',
    seam_position:             'seam_position',
    order_of_walls:            'wall_infill_order',
    xy_hole_compensation:      'xy_hole_compensation',
    elephant_foot_compensation:'elefant_foot_compensation',  // Bambu typo is real
    outer_wall_line_width:     'outer_wall_line_width',
    inner_wall_line_width:     'inner_wall_line_width',
    top_surface_line_width:    'top_surface_line_width',
    arc_fitting:               'enable_arc_fitting',
    avoid_crossing_walls:      'reduce_crossing_wall',
    only_one_wall_top:         'only_one_wall_top',
    bridge_flow:               'bridge_flow',
    wall_loops:                'wall_loops',
    top_shell_layers:          'top_shell_layers',
    bottom_shell_layers:       'bottom_shell_layers',
    sparse_infill_pattern:     'sparse_infill_pattern',
    sparse_infill_density:     'sparse_infill_density',
    top_surface_pattern:       'top_surface_pattern',
    bottom_surface_pattern:    'bottom_surface_pattern',
    internal_solid_infill_pattern: 'internal_solid_infill_pattern',
    infill_combination:        'infill_combination',
    outer_wall_speed:          'outer_wall_speed',
    inner_wall_speed:          'inner_wall_speed',
    initial_layer_speed:       'initial_layer_speed',
    top_surface_speed:         'top_surface_speed',
    gap_fill_speed:            'gap_infill_speed',
    outer_wall_acceleration:   'outer_wall_acceleration',
    inner_wall_acceleration:   'inner_wall_acceleration',
    initial_layer_acceleration:'initial_layer_acceleration',
    support_type:              'support_type',
    support_style:             'support_style',
    support_threshold_angle:   'support_threshold_angle',
    support_z_distance:        'support_top_z_distance',
    support_interface_layers:  'support_interface_top_layers',
    support_interface_pattern: 'support_interface_pattern',
    brim_width:                'brim_width',
    ironing:                   'ironing_type',
    slow_down_tall:            'enable_height_slowdown',
  };

  // BS fields that need array wrapping: ["value"] instead of "value"
  const BAMBU_ARRAY_FIELDS = new Set([
    'outer_wall_speed', 'inner_wall_speed', 'sparse_infill_speed',
    'internal_solid_infill_speed', 'top_surface_speed', 'bridge_speed',
    'gap_infill_speed', 'initial_layer_speed', 'travel_speed',
    'default_acceleration', 'outer_wall_acceleration', 'inner_wall_acceleration',
    'sparse_infill_acceleration', 'top_surface_acceleration', 'initial_layer_acceleration',
    'travel_acceleration', 'initial_layer_travel_acceleration',
    'nozzle_temperature', 'nozzle_temperature_initial_layer',
    'hot_plate_temp', 'hot_plate_temp_initial_layer',
    'cool_plate_temp', 'cool_plate_temp_initial_layer',
    'textured_plate_temp', 'textured_plate_temp_initial_layer',
    'eng_plate_temp', 'eng_plate_temp_initial_layer',
    'fan_min_speed', 'fan_max_speed', 'additional_cooling_fan_speed',
    'overhang_fan_speed', 'slow_down_layer_time', 'enable_height_slowdown',
    'filament_max_volumetric_speed', 'filament_flow_ratio',
    'pressure_advance', 'filament_retraction_length', 'filament_retraction_speed',
  ]);

  // Bambu Studio printer name format: "Bambu Lab X1 Carbon 0.4 nozzle"
  const BAMBU_PRINTER_NAMES = {
    x1c:      'Bambu Lab X1 Carbon',
    x1e:      'Bambu Lab X1E',
    p1s:      'Bambu Lab P1S',
    p1p:      'Bambu Lab P1P',
    p2s:      'Bambu Lab P2S',
    a1:       'Bambu Lab A1',
    a1mini:   'Bambu Lab A1 mini',
    h2c:      'Bambu Lab H2C',
    h2d:      'Bambu Lab H2D',
    h2s:      'Bambu Lab H2S',
  };

  // Printer base names for building compatible_printers dynamically (nozzle appended at export time)
  const BAMBU_COMPATIBLE_PRINTER_BASE = {
    x1c:    'Bambu Lab X1 Carbon',
    x1e:    'Bambu Lab X1E',
    p1s:    'Bambu Lab P1S',
    p1p:    'Bambu Lab P1P',
    p2s:    'Bambu Lab P2S',
    a1:     'Bambu Lab A1',
    a1mini: 'Bambu Lab A1 mini',
    h2c:    'Bambu Lab H2C',
    h2d:    'Bambu Lab H2D',
    h2s:    'Bambu Lab H2S',
  };

  // Bambu Studio process profile inheritance: printer_id → { layer_height → exact system profile name }
  // These names MUST match installed system profiles exactly. P1S/X1C/X1E share CoreXY process profiles.
  const BAMBU_PROCESS_INHERITS = {
    x1c:    { '0.08': '0.08mm Extra Fine @BBL X1C', '0.12': '0.12mm Fine @BBL X1C', '0.15': '0.16mm Optimal @BBL X1C', '0.20': '0.20mm Standard @BBL X1C', '0.24': '0.24mm Draft @BBL X1C', '0.28': '0.28mm Extra Draft @BBL X1C', '0.30': '0.28mm Extra Draft @BBL X1C' },
    x1e:    null,  // shares with X1C
    p1s:    null,  // shares with X1C
    p2s:    null,  // shares with X1C
    p1p:    { '0.08': '0.08mm Extra Fine @BBL P1P', '0.12': '0.12mm Fine @BBL P1P', '0.15': '0.16mm Optimal @BBL P1P', '0.20': '0.20mm Standard @BBL P1P', '0.24': '0.24mm Draft @BBL P1P', '0.28': '0.28mm Extra Draft @BBL P1P', '0.30': '0.28mm Extra Draft @BBL P1P' },
    a1:     { '0.08': '0.08mm Extra Fine @BBL A1', '0.12': '0.12mm Fine @BBL A1', '0.15': '0.16mm Optimal @BBL A1', '0.20': '0.20mm Standard @BBL A1', '0.24': '0.24mm Draft @BBL A1', '0.28': '0.28mm Extra Draft @BBL A1', '0.30': '0.28mm Extra Draft @BBL A1' },
    a1mini: { '0.08': '0.08mm Extra Fine @BBL A1M', '0.12': '0.12mm Fine @BBL A1M', '0.15': '0.16mm Optimal @BBL A1M', '0.20': '0.20mm Standard @BBL A1M', '0.24': '0.24mm Draft @BBL A1M', '0.28': '0.28mm Extra Draft @BBL A1M', '0.30': '0.28mm Extra Draft @BBL A1M' },
  };

  // Bambu Studio filament profile inheritance: material_id → exact system profile name
  // Uses @base suffix — the universal base profile that all printer-specific variants inherit from
  // Must match exact names shown in Bambu Studio under System presets > Bambu / Generic
  // Bambu Studio filament base names: material_id → BS filament name (without printer suffix)
  // The full inherits string is built dynamically: baseName + " @BBL " + printerSuffix
  const BAMBU_FILAMENT_BASE_NAMES = {
    pla_basic:  'Bambu PLA Basic',
    pla_matte:  'Bambu PLA Matte',
    pla_silk:   'Bambu PLA Silk',
    pla_cf:     'Bambu PLA-CF',
    petg_basic: 'Bambu PETG Basic',
    petg_hf:    'Bambu PETG HF',
    petg_cf:    'Bambu PETG-CF',
    abs:        'Bambu ABS',
    asa:        'Bambu ASA',
    tpu_95a:    'Bambu TPU 95A',
    tpu_90a:    'Bambu TPU 95A',    // 90A not in BS, use 95A as closest
    tpu_85a:    'Bambu TPU 95A',    // 85A not in BS, use 95A as closest
    pva:        'Bambu PVA',
    pa:         'Generic PA',
    pa_cf:      'Bambu PAHT-CF',
    pc:         'Generic PC',
    pet_cf:     'Bambu PETG-CF',    // PET-CF closest to PETG-CF
    hips:       'Generic HIPS',
  };

  // Fallback by group if material ID not found
  const BAMBU_FILAMENT_BASE_BY_GROUP = {
    PLA:  'Bambu PLA Basic',
    PETG: 'Bambu PETG Basic',
    ABS:  'Bambu ABS',
    ASA:  'Bambu ASA',
    TPU:  'Bambu TPU 95A',
    PA:   'Generic PA',
    PC:   'Generic PC',
    PVA:  'Bambu PVA',
    HIPS: 'Generic HIPS',
  };

  // Known printer-specific filament profiles that exist in BS system folder
  // Format: { materialBaseName: { printerId: 'exact suffix' } }
  // If a material+printer combo isn't listed here, we fall back to @base
  const BAMBU_FILAMENT_PRINTER_OVERRIDES = {
    'Bambu PLA Basic':  { p1s: 'P1S 0.4 nozzle', x1c: 'X1C', p2s: 'P2S', a1: 'A1', a1mini: 'A1M', h2c: 'H2C', h2d: 'H2D', h2s: 'H2S' },
    'Bambu PLA Matte':  { p1s: 'P1S 0.4 nozzle', x1c: 'X1C', p2s: 'P2S', a1: 'A1', a1mini: 'A1M', h2c: 'H2C', h2d: 'H2D', h2s: 'H2S' },
    'Bambu PLA Silk':   { x1c: 'X1C', p2s: 'P2S', a1: 'A1', a1mini: 'A1M', h2c: 'H2C', h2d: 'H2D', h2s: 'H2S' },
    'Bambu PLA-CF':     { x1c: 'X1C', p2s: 'P2S', a1: 'A1', a1mini: 'A1M', h2c: 'H2C', h2d: 'H2D', h2s: 'H2S' },
    'Bambu PETG Basic': { x1c: 'X1C', p2s: 'P2S', a1: 'A1', a1mini: 'A1M', h2c: 'H2C', h2d: 'H2D', h2s: 'H2S' },
    'Bambu PETG HF':    { p1s: 'P1S 0.4 nozzle', x1c: 'X1C', p2s: 'P2S', a1: 'A1', a1mini: 'A1M', h2c: 'H2C', h2d: 'H2D', h2s: 'H2S' },
    'Bambu PETG-CF':    { x1c: 'X1C', p2s: 'P2S', a1: 'A1', h2c: 'H2C', h2d: 'H2D', h2s: 'H2S' },
    'Bambu ABS':        { p1s: 'P1S 0.4 nozzle', x1c: 'X1C', x1e: 'X1E', p2s: 'P2S', a1: 'A1', h2c: 'H2C', h2d: 'H2D', h2s: 'H2S' },
    'Bambu ASA':        { x1c: 'X1C', x1e: 'X1E', p2s: 'P2S', a1: 'A1', h2c: 'H2C', h2d: 'H2D', h2s: 'H2S' },
    'Bambu TPU 95A':    { x1c: 'X1C', p2s: 'P2S', a1: 'A1', a1mini: 'A1M', h2c: 'H2C', h2d: 'H2D', h2s: 'H2S' },
    'Bambu PVA':        { x1c: 'X1C', p2s: 'P2S', a1: 'A1', h2c: 'H2C', h2d: 'H2D', h2s: 'H2S' },
    'Bambu PAHT-CF':    { x1c: 'X1C', x1e: 'X1E', p2s: 'P2S', a1: 'A1', h2c: 'H2C', h2d: 'H2D', h2s: 'H2S' },
    'Generic PA':       { x1c: 'X1C', p2s: 'P2S', a1: 'A1', h2c: 'H2C', h2d: 'H2D', h2s: 'H2S' },
    'Generic PC':       { p1s: 'P1S', x1c: 'X1C', x1e: 'X1E', p2s: 'P2S', a1: 'A1', h2c: 'H2C', h2d: 'H2D', h2s: 'H2S' },
    'Generic HIPS':     { x1c: 'X1C', p2s: 'P2S', a1: 'A1', a1mini: 'A1M', h2c: 'H2C', h2d: 'H2D', h2s: 'H2S' },
  };

  function _findProcessParent(printerId, layerHeight) {
    // Resolve printers that share profiles with X1C
    const map = BAMBU_PROCESS_INHERITS[printerId] || BAMBU_PROCESS_INHERITS.x1c;
    if (!map) return null;
    // Find closest available layer height (keys are strings like '0.20')
    const available = Object.keys(map).map(Number).sort();
    const target = parseFloat(layerHeight);
    let closest = available[0];
    for (const h of available) {
      if (Math.abs(h - target) < Math.abs(closest - target)) closest = h;
    }
    // Look up using the original string key from the map
    const closestKey = Object.keys(map).find(k => Math.abs(Number(k) - closest) < 0.001);
    return closestKey ? map[closestKey] : null;
  }

  function _findFilamentParent(materialId, materialGroup, printerId) {
    const baseName = BAMBU_FILAMENT_BASE_NAMES[materialId]
                  || BAMBU_FILAMENT_BASE_BY_GROUP[materialGroup];
    if (!baseName) return null;
    // Use printer-specific profile if one exists, otherwise fall back to X1C
    // compatible_printers is added to the exported user profile to override any restriction
    const overrides = BAMBU_FILAMENT_PRINTER_OVERRIDES[baseName];
    if (overrides && overrides[printerId]) {
      return `${baseName} @BBL ${overrides[printerId]}`;
    }
    // X1C has the broadest filament coverage — use as fallback
    // Our exported profile will include compatible_printers to allow it on any printer
    return `${baseName} @BBL X1C`;
  }

  // ── Extract numeric value from engine output strings ────────────────────────
  function _extractValue(str) {
    if (str == null) return null;
    const s = String(str).trim();
    // Handle "Enabled" / "Disabled" / boolean-like
    if (/^enabled/i.test(s)) return '1';
    if (/^disabled/i.test(s)) return '0';
    // Handle percentage: "15%" → "15%"
    if (/^\d+%$/.test(s)) return s;
    // Handle ranges: "5–8 mm" → take lower bound
    const rangeMatch = s.match(/^(\d+(?:\.\d+)?)[–\-](\d+(?:\.\d+)?)/);
    if (rangeMatch) return rangeMatch[1];
    // Handle plain number with optional unit: "200 mm/s" → "200", "0.2 mm" → "0.2"
    const numMatch = s.match(/^(\d+(?:\.\d+)?)/);
    if (numMatch) return numMatch[1];
    // Named values: pass through lowercase
    return s.toLowerCase().replace(/ /g, '');
  }

  // ── Bambu Studio JSON export ────────────────────────────────────────────────
  // Returns { process: {...}, filament: {...} } — two Bambu Studio-importable JSON objects
  function exportBambuStudioJSON(state) {
    const printer  = getPrinter(state.printer);
    const material = getMaterial(state.material);
    const nozzle   = getNozzle(state.nozzle);
    if (!printer || !material || !nozzle) return null;

    const slicer = getSlicerForPrinter(state.printer);
    if (slicer !== 'bambu_studio') return null;  // Bambu printers only

    // Fill default filters so resolveProfile returns a complete set of params
    const exportState = Object.assign({}, state, {
      surface:     state.surface     || 'standard',
      strength:    state.strength    || 'standard',
      speed:       state.speed       || 'balanced',
      environment: state.environment || 'normal',
    });

    const profile = resolveProfile(exportState);
    const adv     = getAdvancedFilamentSettings(state);
    const bs      = material.base_settings;
    const pa      = _resolvePA(bs, nozzle);

    // ── Process profile ───────────────────────────────────────────────────────
    const printerName = BAMBU_PRINTER_NAMES[state.printer] || printer.name;
    const nozzleStr   = String(nozzle.size);
    const surfaceId   = state.surface || 'standard';

    // Resolve layer height for inherits lookup
    const layerHeight = profile.layer_height ? parseFloat(String(profile.layer_height.value).match(/[\d.]+/)?.[0] || '0.20') : 0.20;
    const processParent = _findProcessParent(state.printer, layerHeight);
    const filamentParent = _findFilamentParent(state.material, material.group, state.printer);
    if (!processParent) return null;  // Can't export without valid parent

    const processName = `3DPA ${material.name} ${layerHeight}mm @${printerName}`;

    const process = {
      from: 'User',
      inherits: processParent,
      name: processName,
      print_settings_id: processName,
      version: '2.5.0.14',
    };

    // Map engine params to BS fields
    Object.entries(BAMBU_PROCESS_MAP).forEach(([engineKey, bsKey]) => {
      const param = profile[engineKey];
      if (!param) return;
      const raw = param.value ?? param;
      const val = _extractValue(raw);
      if (val == null) return;

      // Ironing special: "Enabled — Monotonic line" → "top"
      if (engineKey === 'ironing') {
        process[bsKey] = /enabled/i.test(String(raw)) ? 'top' : 'no ironing';
        return;
      }
      // Support type: "Tree" → "tree(auto)", "Normal" → "normal(auto)"
      if (engineKey === 'support_type') {
        process[bsKey] = /tree/i.test(String(raw)) ? 'tree(auto)' : 'normal(auto)';
        return;
      }
      // Wall generator: preserve casing
      if (engineKey === 'wall_generator') {
        process[bsKey] = String(raw).toLowerCase();
        return;
      }
      // Boolean-like toggles
      if (engineKey === 'arc_fitting' || engineKey === 'avoid_crossing_walls' ||
          engineKey === 'only_one_wall_top' || engineKey === 'infill_combination' ||
          engineKey === 'slow_down_tall') {
        process[bsKey] = /enabled|1|true/i.test(String(raw)) ? '1' : '0';
        return;
      }
      // Seam: normalize to Bambu values. Accept both UI-form ("Sharpest corner")
      // and pre-substituted slicer-form ("nearest") since patternFor() may have
      // already translated the UI label to the target-slicer canonical form.
      if (engineKey === 'seam_position') {
        const seamMap = {
          'aligned': 'aligned', 'aligned (or back)': 'aligned',
          'sharpest corner': 'nearest', 'nearest': 'nearest',
          'random': 'random',
          'back': 'back', 'rear': 'back',
        };
        process[bsKey] = seamMap[String(raw).toLowerCase()] || 'aligned';
        return;
      }
      // Order of walls: normalize
      if (engineKey === 'order_of_walls') {
        process[bsKey] = /inner.*outer/i.test(String(raw)) ? 'inner wall/outer wall/infill' : 'outer wall/inner wall/infill';
        return;
      }
      // Infill pattern: normalize
      if (engineKey === 'sparse_infill_pattern') {
        const patMap = { 'gyroid': 'gyroid', 'grid': 'grid', 'cross hatch': 'crosshatch', 'honeycomb': 'honeycomb' };
        process[bsKey] = patMap[String(raw).toLowerCase()] || String(raw).toLowerCase();
        return;
      }
      // Top/bottom surface pattern: normalize
      if (engineKey === 'top_surface_pattern' || engineKey === 'bottom_surface_pattern') {
        const spMap = { 'monotonic line': 'monotonicline', 'monotonic': 'monotonic', 'rectilinear': 'rectilinear' };
        process[bsKey] = spMap[String(raw).toLowerCase()] || String(raw).toLowerCase();
        return;
      }
      // Internal solid infill pattern
      if (engineKey === 'internal_solid_infill_pattern') {
        process[bsKey] = /rectilinear|auto/i.test(String(raw)) ? 'zig-zag' : String(raw).toLowerCase();
        return;
      }
      // Support style
      if (engineKey === 'support_style') {
        process[bsKey] = /tree hybrid/i.test(String(raw)) ? 'tree_hybrid' : 'default';
        return;
      }
      // Support interface pattern: Bambu's modern presets use 'rectilinear_interlaced'
      // (grep of this repo's bambu configs shows that's the only value Bambu itself writes).
      // Legacy 'rectilinear' is still accepted by the parser but saved presets always
      // upgrade to the interlaced variant — match the vendor format for lossless import.
      if (engineKey === 'support_interface_pattern') {
        const sipMap = { 'rectilinear': 'rectilinear_interlaced', 'grid': 'grid', 'auto': 'auto' };
        process[bsKey] = sipMap[String(raw).toLowerCase()] || 'auto';
        return;
      }
      // Brim width: "5–8 mm" → "5", "Mouse ears (corners only)" → "5" (BS has no mouse ears)
      if (engineKey === 'brim_width') {
        const rawStr = String(raw).toLowerCase();
        if (/mouse|corner/i.test(rawStr)) {
          process[bsKey] = '5';  // Approximate: BS doesn't support mouse ears, use small brim
        } else {
          const num = String(raw).match(/(\d+)/);
          process[bsKey] = num ? num[1] : '5';
        }
        return;
      }

      // Array-wrapped fields
      process[bsKey] = BAMBU_ARRAY_FIELDS.has(bsKey) ? [val] : val;
    });

    // ── Filament profile ──────────────────────────────────────────────────────
    const filamentName = `3DPA ${material.name}`;

    const printerBase = BAMBU_COMPATIBLE_PRINTER_BASE[state.printer];
    const compatiblePrinters = printerBase
      ? [`${printerBase} ${nozzleStr} nozzle`]
      : null;
    const filament = {
      from: 'User',
      inherits: filamentParent || '',
      name: filamentName,
      filament_settings_id: [filamentName],  // MUST be Array of Strings
      filament_type: [material.group || 'PLA'],  // Always required — BS uses this to identify filament configs
      version: '2.5.0.14',
      // Override parent's compatible_printers so BS accepts this profile on any printer
      ...(compatiblePrinters ? { compatible_printers: compatiblePrinters } : {}),
    };

    // Temperatures — use adjusted temps from engine
    if (adv) {
      const nzInit  = String(parseInt(adv.initial_layer_temp) || '');
      const nzOther = String(parseInt(adv.other_layers_temp) || '');
      const bdInit  = String(parseInt(adv.initial_layer_bed_temp) || '');
      const bdOther = String(parseInt(adv.other_layers_bed_temp) || '');
      filament.nozzle_temperature               = [nzOther];
      filament.nozzle_temperature_initial_layer  = [nzInit];
      // Populate all plate temps — use the same value
      filament.hot_plate_temp                    = [bdOther];
      filament.hot_plate_temp_initial_layer      = [bdInit];
      filament.textured_plate_temp               = [bdOther];
      filament.textured_plate_temp_initial_layer  = [bdInit];
      filament.cool_plate_temp                   = [String(Math.max(0, parseInt(bdOther) - 20))];
      filament.cool_plate_temp_initial_layer      = [String(Math.max(0, parseInt(bdInit) - 20))];
    }

    // Flow / extrusion
    if (bs.flow_ratio != null)         filament.filament_flow_ratio       = [String(bs.flow_ratio)];
    if (pa != null)                    filament.pressure_advance          = [String(pa)];
    if (bs.retraction_length != null)  filament.filament_retraction_length = [String(bs.retraction_length)];
    if (bs.retraction_speed != null)   filament.filament_retraction_speed  = [String(bs.retraction_speed)];

    // MVS
    const mvsVal = bs.max_mvs?.[String(nozzle.size)];
    if (mvsVal)  filament.filament_max_volumetric_speed = [String(parseFloat(mvsVal))];

    // Fan speeds
    if (bs.cooling_fan_min != null) {
      filament.fan_min_speed = [String(parseInt(bs.cooling_fan_min) || 0)];
      filament.fan_max_speed = ['100'];
    }
    // Overhang fan speed (e.g. "80%" → 80)
    if (bs.cooling_fan_overhang != null) {
      filament.overhang_fan_speed = [String(parseInt(bs.cooling_fan_overhang) || 0)];
    }
    // Slow down below layer time (e.g. "15 s" → 15)
    if (bs.slow_layer_time != null) {
      filament.slow_down_layer_time = [String(parseInt(bs.slow_layer_time) || 0)];
    }

    return { process, filament };
  }

  // ── Format profile as shareable text ────────────────────────────────────────
  function formatProfileAsText(state) {
    const printer  = getPrinter(state.printer);
    const material = getMaterial(state.material);
    const nozzle   = getNozzle(state.nozzle);
    if (!printer || !material || !nozzle) return null;

    const profile    = resolveProfile(state);
    const adv        = getAdvancedFilamentSettings(state);
    const filament   = getFilamentProfile(state.material);
    const slicer     = getSlicerForPrinter(state.printer);
    const tabs       = SLICER_TABS[slicer] || SLICER_TABS.bambu_studio;
    const labels     = SLICER_PARAM_LABELS[slicer] || SLICER_PARAM_LABELS.bambu_studio;
    const warnings   = getWarnings(state);
    const env        = getEnv(state.environment);

    const slicerName = slicer === 'bambu_studio' ? 'Bambu Studio'
                     : slicer === 'prusaslicer'  ? 'PrusaSlicer'
                     :                             'OrcaSlicer';

    const processTabName = slicer === 'prusaslicer' ? 'Print Settings tab'
                         :                            'Process tab';

    // Human-readable filter names
    const FILTER_NAMES = {
      surface:  { draft: 'Draft', standard: 'Standard', fine: 'Fine', very_fine: 'Very Fine', ultra: 'Ultra', maximum: 'Maximum' },
      strength: { minimal: 'Minimal', standard: 'Standard', strong: 'Strong', maximum: 'Maximum' },
      speed:    { fast: 'Fast', balanced: 'Balanced', quality: 'Quality above all' },
    };

    const lines = [];
    lines.push('═══════════════════════════════════════');
    lines.push('  3D Print Assistant — Profile Export');
    lines.push('═══════════════════════════════════════');
    lines.push('');
    lines.push(`Printer:          ${printer.name}`);
    lines.push(`Nozzle:           ${nozzle.name}`);
    lines.push(`Material:         ${material.name}`);
    lines.push(`Slicer:           ${slicerName}`);
    if (state.surface)     lines.push(`Surface quality:  ${FILTER_NAMES.surface[state.surface]   || state.surface}`);
    if (state.strength)    lines.push(`Strength:         ${FILTER_NAMES.strength[state.strength] || state.strength}`);
    if (state.speed)       lines.push(`Speed priority:   ${FILTER_NAMES.speed[state.speed]       || state.speed}`);
    if (state.environment) lines.push(`Environment:      ${env ? env.name : state.environment}`);
    lines.push('');

    // ── Filament Settings (complete) ─────────────────────────────────────────
    if (adv && filament) {
      lines.push('── Filament Settings ──────────────────');
      lines.push(`  (Filament tab in ${slicerName})`);
      lines.push('');

      // Temperature — smart collapse: if initial === other, show one row
      const nozzleSame = adv.initial_layer_temp === adv.other_layers_temp;
      const bedSame    = adv.initial_layer_bed_temp === adv.other_layers_bed_temp;
      lines.push('  TEMPERATURE');
      if (nozzleSame) {
        lines.push(`    Nozzle temp:             ${adv.initial_layer_temp}  (same for both layers)`);
      } else {
        lines.push(`    Nozzle temp (initial):   ${adv.initial_layer_temp}`);
        lines.push(`    Nozzle temp (other):     ${adv.other_layers_temp}`);
      }
      if (bedSame) {
        lines.push(`    Bed temp:                ${adv.initial_layer_bed_temp}  (same for both layers)`);
      } else {
        lines.push(`    Bed temp (initial):      ${adv.initial_layer_bed_temp}`);
        lines.push(`    Bed temp (other):        ${adv.other_layers_bed_temp}`);
      }
      lines.push('');

      // Fan settings
      const hasFan = filament.cooling_fan != null || adv.cooling_fan_min != null
                  || adv.cooling_fan_overhang != null || adv.slow_layer_time != null;
      if (hasFan) {
        lines.push('  FAN SETTINGS');
        if (filament.cooling_fan != null)      lines.push(`    Part cooling fan:        ${filament.cooling_fan}`);
        if (adv.cooling_fan_min != null)       lines.push(`    Fan speed (min):         ${adv.cooling_fan_min}`);
        if (adv.cooling_fan_overhang != null)  lines.push(`    Overhang fan speed:      ${adv.cooling_fan_overhang}`);
        if (adv.slow_layer_time != null)       lines.push(`    Min layer time:          ${adv.slow_layer_time}`);
        lines.push('');
      }

      // Volumetric speed limit
      const mvs = filament.max_mvs ? (filament.max_mvs[String(nozzle.size)] || null) : null;
      if (mvs) {
        lines.push('  SPEED LIMIT');
        lines.push(`    Max volumetric speed:    ${mvs}`);
        lines.push('');
      }

      // Setup
      lines.push('  SETUP');
      if (filament.build_plate) lines.push(`    Build plate:             ${filament.build_plate}`);
      lines.push(`    AMS compatible:          ${filament.ams ? 'Yes' : 'No'}`);
      if (filament.drying)    lines.push(`    Drying:                  ${filament.drying}`);
      if (filament.enclosure) lines.push(`    Enclosure:               ${filament.enclosure}`);
      lines.push('');

      // Extrusion
      lines.push('  EXTRUSION');
      if (adv.pressure_advance !== '—') lines.push(`    Pressure advance:        ${adv.pressure_advance}`);
      if (adv.flow_ratio !== '—')       lines.push(`    Flow ratio:              ${adv.flow_ratio}`);
      lines.push(`    Retraction length:       ${adv.retraction_length}`);
      lines.push(`    Retraction speed:        ${adv.retraction_speed}`);
      lines.push('');
    }

    // ── Print Profile Settings ───────────────────────────────────────────────
    lines.push('── Print Profile Settings ─────────────');
    lines.push(`  (${processTabName} in ${slicerName})`);
    lines.push('');

    tabs.forEach(tab => {
      const tabParams = tab.sections.flatMap(s => s.params);
      const entries = tabParams
        .filter(p => profile[p])
        .map(p => {
          const val = profile[p].value ?? profile[p];
          const label = labels[p] || p;
          return `    ${label}: ${val}`;
        });
      if (entries.length) {
        lines.push(`  ${tab.label}`);
        entries.forEach(e => lines.push(e));
        lines.push('');
      }
    });

    // Warnings
    if (warnings.length) {
      lines.push('── Warnings ───────────────────────────');
      warnings.forEach(w => {
        const raw = typeof w === 'string' ? w : (w.text || w);
        const clean = String(raw).replace(/<[^>]+>/g, '');
        lines.push(`  ⚠ ${clean}`);
      });
      lines.push('');
    }

    lines.push('───────────────────────────────────────');
    lines.push('Generated by 3dprintassistant.com');

    return lines.join('\n');
  }

  // ── Legacy export (flat reference object) ───────────────────────────────────
  function exportProfile(state) {
    const printer  = getPrinter(state.printer);
    const material = getMaterial(state.material);
    const nozzle   = getNozzle(state.nozzle);
    const env      = getEnv(state.environment);
    if (!printer || !material || !nozzle) return null;

    const profile  = resolveProfile(state);
    const adv      = getAdvancedFilamentSettings(state);

    const flat = {};
    Object.entries(profile).forEach(([k, v]) => { flat[k] = v?.value ?? v; });

    return {
      _meta: {
        generated_by:  '3D Print Assistant',
        generated_at:  new Date().toISOString(),
        printer:       printer.name,
        nozzle:        nozzle.name,
        material:      material.name,
        environment:   env ? env.name : 'Standard room',
      },
      filament: {
        nozzle_temperature:              adv?.initial_layer_temp   ?? null,
        nozzle_temperature_other_layers: adv?.other_layers_temp    ?? null,
        bed_temperature:                 adv?.initial_layer_bed_temp ?? null,
        bed_temperature_other_layers:    adv?.other_layers_bed_temp  ?? null,
        pressure_advance:                _resolvePA(material.base_settings, nozzle),
        flow_ratio:                      material.base_settings.flow_ratio,
        retraction_length:               `${material.base_settings.retraction_length} mm`,
        retraction_speed:                `${material.base_settings.retraction_speed} mm/s`,
      },
      process: flat,
    };
  }

  // ── AMS Purge Volume Calculator ──────────────────────────────────────────────
  // slots: [{ name, brightness }]  brightness: 'dark' | 'medium' | 'light'
  // materialGroup: 'PLA' | 'PETG' | 'ABS' etc. (affects multiplier)
  // Returns { matrix, mult, tip }
  function calcPurgeVolumes(slots, materialGroup) {
    // Base flush volumes (mm³) — community-validated Bambu AMS values
    // Rule: more purge when going from dark→light (dark pigment hard to flush out)
    const BASE = {
      'dark->light':    380,
      'dark->medium':   260,
      'dark->dark':     130,
      'medium->light':  200,
      'medium->medium': 110,
      'medium->dark':    90,
      'light->light':    80,
      'light->medium':   90,
      'light->dark':     80,
    };

    // Material multipliers — higher viscosity / more ooze needs more flush
    const MULT = { PLA:1.0, PETG:1.3, ABS:1.1, ASA:1.1, TPU:1.6, PA:1.2, PC:1.2 };
    const mult = MULT[materialGroup] || 1.0;

    const matrix = slots.map((from, i) =>
      slots.map((to, j) => {
        if (i === j) return 0;
        const key = `${from.brightness}->${to.brightness}`;
        return Math.round((BASE[key] ?? 150) * mult);
      })
    );

    const maxVol = Math.max(...matrix.flat());
    let tip = null;
    if (mult > 1.0) {
      tip = `${materialGroup} requires ${mult}× more purge volume than PLA — higher viscosity leaves more residue between transitions.`;
    }
    if (materialGroup === 'TPU') {
      tip = 'TPU is not AMS compatible — load from rear spool holder for single-color printing.';
    }
    if (maxVol > 300) {
      tip = (tip ? tip + ' ' : '') + 'Consider enabling "Flush into infill" in Bambu Studio → Others to reduce wasted filament.';
    }

    return { matrix, mult, tip };
  }

  // ── Troubleshooter ────────────────────────────────────────────────────────────
  function getSymptoms() {
    return (_troubleshooter.symptoms || []).map(s => ({
      id:   s.id,
      name: t(`sym_${s.id}_name`) ?? s.name,
      icon: s.icon,
      desc: t(`sym_${s.id}_desc`) ?? s.desc,
    }));
  }

  // Returns causes ranked for a symptom, optionally filtered by active material group
  function getTroubleshootingTips(symptomId, materialGroup) {
    const symptom = (_troubleshooter.symptoms || []).find(s => s.id === symptomId);
    if (!symptom) return [];
    return symptom.causes.map(cause => ({
      ...cause,
      relevant: !cause.materials || cause.materials.includes(materialGroup),
    })).sort((a, b) => {
      // Relevant causes float to top, keeping rank order within each group
      if (a.relevant !== b.relevant) return a.relevant ? -1 : 1;
      return a.rank - b.rank;
    });
  }

  // ── Print Time Estimator ─────────────────────────────────────────────────────
  // inputs: { height_mm, width_mm, depth_mm, walls, infill_pct }
  // Returns { low, mid, high, layerHeight, numLayers, outerSpeed }  — times in seconds
  function calcPrintTime({ height_mm, width_mm, depth_mm, walls, infill_pct }, state) {
    const profile = resolveProfile(state);
    const nozzle  = getNozzle(state.nozzle);
    const printer = getPrinter(state.printer);
    const isCoreXY = printer?.series === 'corexy';

    // Parse "150 mm/s" → 150  (graceful fallback to defaults)
    const spd = str => parseFloat(str) || 0;
    const outerSpeed  = spd(profile.outer_wall_speed?.value) || (isCoreXY ? 100 : 80);
    const innerSpeed  = spd(profile.inner_wall_speed?.value) || (isCoreXY ? 200 : 150);
    const infillSpeed = innerSpeed * 1.4;   // infill runs faster than inner wall
    const travelSpeed = isCoreXY ? 300 : 200;

    const layerHeight = parseFloat(profile.layer_height?.value) || 0.2;
    const nozzleDia   = parseFloat(nozzle?.size) || 0.4;
    const numLayers   = Math.ceil(height_mm / layerHeight);

    // ── Wall time ──────────────────────────────────────────────────────────────
    const perimeter  = 2 * (width_mm + depth_mm);
    const outerWalls = 1;
    const innerWalls = Math.max(0, walls - 1);
    const wallTime   = (perimeter * outerWalls * numLayers) / outerSpeed
                     + (perimeter * innerWalls * numLayers) / innerSpeed;

    // ── Infill time ────────────────────────────────────────────────────────────
    const area        = width_mm * depth_mm;
    const infillLines = (area * (infill_pct / 100)) / nozzleDia;
    const infillTime  = (infillLines * numLayers) / infillSpeed;

    // ── Top / bottom solid layers (~4 layers at outer speed) ──────────────────
    const solidLayers = Math.min(4, numLayers) * 2; // top + bottom
    const solidTime   = (area / nozzleDia * solidLayers) / outerSpeed;

    // ── Travel overhead (~8% of extrusion time) ───────────────────────────────
    const extrusionTime = wallTime + infillTime + solidTime;
    const travelTime    = extrusionTime * 0.08;

    // ── Totals: +12% for acceleration / layer changes / fan waits ─────────────
    const base = (extrusionTime + travelTime) * 1.12;

    return {
      low:         Math.round(base * 0.80),   // optimistic
      mid:         Math.round(base),
      high:        Math.round(base * 1.40),   // conservative
      layerHeight,
      numLayers,
      outerSpeed,
    };
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  return {
    init,
    get FILTERS()      { return getFilters(); },
    getFilters,
    get PROFILE_TABS() {
      const tabs = SLICER_TABS[_activeSlicer] || SLICER_TABS.bambu_studio;
      const cap = s => s[0].toUpperCase() + s.slice(1);
      return tabs.map(tab => ({
        ...tab,
        label: t('tab' + cap(tab.id)),
        params: tab.sections.flatMap(s => s.params),
      }));
    },
    get PARAM_LABELS() { return SLICER_PARAM_LABELS[_activeSlicer] || SLICER_PARAM_LABELS.bambu_studio; },
    resolveProfile,
    getWarnings,
    getAdvancedFilamentSettings,
    getAdjustedTemps,
    getFilamentProfile,
    getChecklist,
    getNozzle,
    getMaterial,
    getPrinter,
    getBrands,
    getPrintersByBrand,
    searchPrinters,
    getSlicerForPrinter,
    setActiveSlicer,
    getActiveSlicer,
    isNozzleCompatibleWithMaterial,
    getCompatibleNozzles,
    getSymptoms,
    getTroubleshootingTips,
    exportProfile,
    exportBambuStudioJSON,
    formatProfileAsText,
    calcPurgeVolumes,
    calcPrintTime,
    setLang,
    getLang,
    t,
  };
})();
