// ─── 3D Print Assistant — Engine ─────────────────────────────────────────────
// All business logic lives here. app.js is UI only.
// Data is loaded from /data/*.json — identical pattern to future API calls.
// To migrate to API: replace fetch('./data/...') with fetch('https://api.../...')

const Engine = (() => {
  // ── Private data store (populated by init()) ────────────────────────────────
  let _printers      = [];
  let _materials     = [];
  let _nozzles       = [];
  let _envRules      = [];
  let _objectives    = {};
  let _warnings      = {};
  let _troubleshooter = {};

  // ── Language system ───────────────────────────────────────────────────────────
  let _lang = 'en'; // 'en' | 'da'

  const _T = {
    en: {
      // Header / nav
      logoText:         '3D Print Assistant',
      logoSub:          'Print Profile Configurator',
      modeSimple:       'Simple',
      modeAdvanced:     'Advanced',
      reset:            'Reset',
      navConfigure:     'Configure',
      navTroubleshoot:  'Troubleshoot',
      navPurge:         'AMS Purge',
      // Filter hints
      hintRequired:     'required',
      hintOptional:     'optional',
      hintMulti:        'multi-select',
      // Filter section labels
      filterPrinter:    'Printer',
      filterNozzle:     'Nozzle',
      filterMaterial:   'Material',
      filterUseCase:    'What are you printing?',
      filterSurface:    'Surface Quality',
      filterStrength:   'Strength',
      filterSpeed:      'Speed Priority',
      filterEnv:        'Environment',
      filterSupport:    'Support',
      filterColors:     'Colors / AMS',
      filterLevel:      'Experience Level',
      filterSpecial:    'Special Requirements',
      // Use cases
      ucPrototype:      'Prototype',
      ucFunctional:     'Functional part',
      ucDecorative:     'Decorative',
      ucMiniature:      'Miniature / details',
      ucLarge:          'Large part',
      // Support types
      supNone:          'None',
      supEasy:          'Easy removal',
      supQuality:       'Quality',
      // Color modes
      colSingle:        'Single color',
      colMulti24:       'Multicolor 2–4',
      colMulti5:        'Multicolor 5+',
      // User levels
      lvlBeginner:      'Beginner',
      lvlBeginnerDesc:  'Safe margins',
      lvlInter:         'Intermediate',
      lvlInterDesc:     'Standard',
      lvlAdvanced:      'Advanced',
      lvlAdvancedDesc:  'Precise tuning',
      // Special requirements
      spWaterproof:     'Waterproof',
      spHighTemp:       'High temp (>60°C)',
      spMetallic:       'Metallic finish',
      spMatte:          'Matte finish',
      spGlossy:         'Glossy / Silk',
      spUV:             'UV-resistant',
      // Empty state
      emptyTitle:       'Select your setup above',
      emptySub:         'Choose a printer, nozzle, and material to generate your optimized profile.',
      // Profile panel
      panelFilTitle:    'Filament Settings',
      panelFilSub:      'Filament tab in Bambu Studio',
      panelProfTitle:   'Print Profile Settings',
      panelProfSub:     'Process tab in Bambu Studio',
      exportBtn:        '↓ Export',
      exportSaved:      '✓ Saved',
      compareBtn:       '⇌ Compare',
      compareClear:     '✕ Clear Compare',
      compareLocked:    'Locked A:',
      compareColA:      'A',
      compareColB:      'B current',
      compareHdrA:      'A locked',
      compareHdrB:      'B current',
      // Profile tabs
      tabQuality:       'Quality',
      tabStrength:      'Strength',
      tabSpeed:         'Speed',
      tabSupport:       'Support',
      tabOthers:        'Others',
      // Filament panel sections
      secTemps:         'Temperatures',
      secNozzleTemp:    'Nozzle temperature',
      secBedTemp:       'Bed temperature',
      secCooling:       'Cooling',
      secSpeedLimit:    'Speed limit',
      secSetup:         'Setup',
      secAdvExtrusion:  'Advanced — Extrusion',
      // Filament panel rows
      rowNozzleTemp:    'Nozzle temp',
      rowBedTemp:       'Bed temp',
      rowInitLayer:     'Initial layer',
      rowOtherLayers:   'Other layers',
      rowCoolingFan:    'Part cooling fan',
      rowFanMin:        'Fan speed (min)',
      rowFanOverhang:   'Fan — overhangs',
      rowSlowLayer:     'Slow below layer time',
      rowMVS:           'Max volumetric speed',
      rowBuildPlate:    'Build plate',
      rowAMS:           'AMS compatible',
      rowDrying:        'Drying',
      rowEnclosure:     'Enclosure',
      rowPA:            'Pressure advance',
      rowFlow:          'Flow ratio',
      rowRetractLen:    'Retraction length',
      rowRetractSpd:    'Retraction speed',
      // Misc values
      valYes:           'Yes',
      valNo:            'No',
      noSettings:       'No settings recommended for this tab with the current selection.',
      noSettingsComp:   'No settings to compare for this tab.',
      advDivider:       'Advanced',
      // Checklist
      checklistTitle:   'Before you print',
      checklistSteps:   'steps',
      // Troubleshooter
      troubleTitle:     "What's going wrong?",
      troubleSub:       'Pick a symptom — get a ranked list of likely causes and exact setting fixes.',
      troubleHeader:    'Likely causes — most common first',
      troubleMatNote:   'Select a material in Configure to highlight most relevant causes',
      troubleMatActive: 'Highlighted causes are most relevant for',
      // Symptoms (names + descriptions — fallback to JSON values if key missing)
      sym_stringing_name:        'Stringing / Oozing',
      sym_stringing_desc:        'Fine hairs or threads between parts',
      sym_warping_name:          'Warping / Bed Adhesion',
      sym_warping_desc:          'Corners or edges lifting off the bed',
      sym_layer_separation_name: 'Layer Separation',
      sym_layer_separation_desc: 'Layers splitting apart or not bonding',
      sym_under_extrusion_name:  'Under-extrusion / Gaps',
      sym_under_extrusion_desc:  'Gaps in walls, weak infill, or missing material',
      sym_over_extrusion_name:   'Over-extrusion / Blobs',
      sym_over_extrusion_desc:   'Too much material, blobs, or thick rough walls',
      sym_elephant_foot_name:    'Elephant Foot',
      sym_elephant_foot_desc:    'First layer flares out wider than the rest',
      sym_ringing_name:          'Ringing / Ghosting',
      sym_ringing_desc:          'Ripple or wave pattern near sharp features',
      sym_first_layer_name:      'Poor First Layer',
      sym_first_layer_desc:      'First layer not sticking, uneven, or has gaps',
      // AMS Purge
      purgeTitle:       'AMS Purge Volume Calculator',
      purgeSub:         'Calculate optimal filament flush volumes to prevent color contamination between AMS transitions.',
      purgeSlots:       'AMS slots',
      purgeMatNote:     'Select a material in Configure to apply the correct multiplier',
      purgeUsing:       'Using',
      purgeMultLabel:   'multiplier',
      purgeMatLabel:    'Flush volume (mm³) — from row → to column',
      purgeFromTo:      'From ↓ · To →',
      purgeLow:         'Low <120',
      purgeMid:         'Medium 120–220',
      purgeHigh:        'High 220–320',
      purgeCrit:        'Critical >320',
      purgeUnit:        'mm³ per transition',
      // Print time estimator
      ptTitle:          'Print Time Estimator',
      ptSub:            'Rough estimate based on your profile speeds and object dimensions.',
      ptHeight:         'Height',
      ptWidth:          'Width',
      ptDepth:          'Depth',
      ptWalls:          'Walls',
      ptInfill:         'Infill',
      ptLayers:         'layers',
      ptAt:             'at',
      ptOuterSpeed:     'outer wall',
      ptResult:         'Estimated print time',
      ptDisclaimer:     'Rough estimate only — excludes supports, prime tower, and complex geometry.',
      // Footer
      footer:           '3D Print Assistant — your 3D printing companion',
    },
    da: {
      // Header / nav
      logoText:         '3D Print Assistant',
      logoSub:          'Printprofil Konfigurator',
      modeSimple:       'Simpel',
      modeAdvanced:     'Avanceret',
      reset:            'Nulstil',
      navConfigure:     'Konfigurer',
      navTroubleshoot:  'Fejlfinding',
      navPurge:         'AMS Skylning',
      // Filter hints
      hintRequired:     'påkrævet',
      hintOptional:     'valgfri',
      hintMulti:        'vælg flere',
      // Filter section labels
      filterPrinter:    'Printer',
      filterNozzle:     'Dyse',
      filterMaterial:   'Materiale',
      filterUseCase:    'Hvad printer du?',
      filterSurface:    'Overfladekvalitet',
      filterStrength:   'Styrke',
      filterSpeed:      'Hastighedsprioritet',
      filterEnv:        'Omgivelser',
      filterSupport:    'Understøtning',
      filterColors:     'Farver / AMS',
      filterLevel:      'Erfaringsniveau',
      filterSpecial:    'Særlige krav',
      // Use cases
      ucPrototype:      'Prototype',
      ucFunctional:     'Funktionsdel',
      ucDecorative:     'Dekorativ',
      ucMiniature:      'Miniature / detaljer',
      ucLarge:          'Stor del',
      // Support types
      supNone:          'Ingen',
      supEasy:          'Nem fjernelse',
      supQuality:       'Kvalitet',
      // Color modes
      colSingle:        'Enkelt farve',
      colMulti24:       'Multifarve 2–4',
      colMulti5:        'Multifarve 5+',
      // User levels
      lvlBeginner:      'Begynder',
      lvlBeginnerDesc:  'Sikre marginer',
      lvlInter:         'Mellemniveau',
      lvlInterDesc:     'Standard',
      lvlAdvanced:      'Avanceret',
      lvlAdvancedDesc:  'Præcis justering',
      // Special requirements
      spWaterproof:     'Vandtæt',
      spHighTemp:       'Høj temp (>60°C)',
      spMetallic:       'Metallisk finish',
      spMatte:          'Mat overflade',
      spGlossy:         'Blank / Silke',
      spUV:             'UV-resistent',
      // Empty state
      emptyTitle:       'Vælg dit setup ovenfor',
      emptySub:         'Vælg printer, dyse og materiale for at generere din optimerede profil.',
      // Profile panel
      panelFilTitle:    'Filament indstillinger',
      panelFilSub:      'Filament fanen i Bambu Studio',
      panelProfTitle:   'Printprofil indstillinger',
      panelProfSub:     'Process fanen i Bambu Studio',
      exportBtn:        '↓ Eksporter',
      exportSaved:      '✓ Gemt',
      compareBtn:       '⇌ Sammenlign',
      compareClear:     '✕ Ryd sammenligning',
      compareLocked:    'Låst A:',
      compareColA:      'A',
      compareColB:      'B aktuel',
      compareHdrA:      'A låst',
      compareHdrB:      'B aktuel',
      // Profile tabs
      tabQuality:       'Kvalitet',
      tabStrength:      'Styrke',
      tabSpeed:         'Hastighed',
      tabSupport:       'Understøtning',
      tabOthers:        'Andet',
      // Filament panel sections
      secTemps:         'Temperaturer',
      secNozzleTemp:    'Dysetemperatur',
      secBedTemp:       'Bordtemperatur',
      secCooling:       'Køling',
      secSpeedLimit:    'Hastighedsgrænse',
      secSetup:         'Opsætning',
      secAdvExtrusion:  'Avanceret — Ekstrudering',
      // Filament panel rows
      rowNozzleTemp:    'Dysetemperatur',
      rowBedTemp:       'Bordtemperatur',
      rowInitLayer:     'Første lag',
      rowOtherLayers:   'Øvrige lag',
      rowCoolingFan:    'Kølingsblæser',
      rowFanMin:        'Blæser (min)',
      rowFanOverhang:   'Blæser — overhæng',
      rowSlowLayer:     'Langsom ved kort lagtid',
      rowMVS:           'Maks. volumetrisk hastighed',
      rowBuildPlate:    'Printplade',
      rowAMS:           'AMS kompatibel',
      rowDrying:        'Tørring',
      rowEnclosure:     'Kabinet',
      rowPA:            'Trykkompensation',
      rowFlow:          'Flowforhold',
      rowRetractLen:    'Tilbagetrækningslængde',
      rowRetractSpd:    'Tilbagetrækningshastighed',
      // Misc values
      valYes:           'Ja',
      valNo:            'Nej',
      noSettings:       'Ingen indstillinger anbefalet til denne fane med den aktuelle opsætning.',
      noSettingsComp:   'Ingen indstillinger at sammenligne for denne fane.',
      advDivider:       'Avanceret',
      // Checklist
      checklistTitle:   'Før du printer',
      checklistSteps:   'trin',
      // Troubleshooter
      troubleTitle:     'Hvad går galt?',
      troubleSub:       'Vælg et symptom — få en rangeret liste over sandsynlige årsager og præcise indstillingsrettelser.',
      troubleHeader:    'Sandsynlige årsager — mest almindelige først',
      troubleMatNote:   'Vælg et materiale i Konfigurer for at fremhæve de mest relevante årsager',
      troubleMatActive: 'Fremhævede årsager er mest relevante for',
      // Symptoms
      sym_stringing_name:        'Stringing / Dryp',
      sym_stringing_desc:        'Fine hår eller tråde mellem dele',
      sym_warping_name:          'Warping / Pladefæste',
      sym_warping_desc:          'Hjørner eller kanter løfter sig fra pladen',
      sym_layer_separation_name: 'Lagadskillelse',
      sym_layer_separation_desc: 'Lag der splitter eller ikke binder',
      sym_under_extrusion_name:  'Underekstrudering / Huller',
      sym_under_extrusion_desc:  'Huller i vægge, svag infill eller manglende materiale',
      sym_over_extrusion_name:   'Overekstrudering / Klatter',
      sym_over_extrusion_desc:   'For meget materiale, klatter eller tykke ru vægge',
      sym_elephant_foot_name:    'Elefantfod',
      sym_elephant_foot_desc:    'Første lag udvider sig bredere end resten',
      sym_ringing_name:          'Ringing / Ghosting',
      sym_ringing_desc:          'Rippel- eller bølgemønster nær skarpe kanter',
      sym_first_layer_name:      'Dårligt første lag',
      sym_first_layer_desc:      'Første lag klæber ikke, er ujævnt eller har huller',
      // AMS Purge
      purgeTitle:       'AMS Skylningsvolumen Beregner',
      purgeSub:         'Beregn optimale skylningsvolumener for at forhindre farveforurening mellem AMS-skift.',
      purgeSlots:       'AMS pladser',
      purgeMatNote:     'Vælg et materiale i Konfigurer for at anvende den korrekte multiplikator',
      purgeUsing:       'Bruger',
      purgeMultLabel:   'multiplikator',
      purgeMatLabel:    'Skylningsvolumen (mm³) — fra række → til kolonne',
      purgeFromTo:      'Fra ↓ · Til →',
      purgeLow:         'Lav <120',
      purgeMid:         'Middel 120–220',
      purgeHigh:        'Høj 220–320',
      purgeCrit:        'Kritisk >320',
      purgeUnit:        'mm³ pr. skift',
      // Print time estimator
      ptTitle:          'Printtidsestimator',
      ptSub:            'Groft estimat baseret på dine profilhastigheder og objektmål.',
      ptHeight:         'Højde',
      ptWidth:          'Bredde',
      ptDepth:          'Dybde',
      ptWalls:          'Vægge',
      ptInfill:         'Fyld',
      ptLayers:         'lag',
      ptAt:             'ved',
      ptOuterSpeed:     'ydervæg',
      ptResult:         'Estimeret printtid',
      ptDisclaimer:     'Kun groft estimat — ekskluderer understøtninger, prime tower og kompleks geometri.',
      // Footer
      footer:           '3D Print Assistant — din 3D-print ledsager',
    },
  };

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

  // ── Init — load all JSON data files ─────────────────────────────────────────
  async function init() {
    // Restore persisted language preference
    try { const stored = localStorage.getItem('3dpa_lang'); if (stored && _T[stored]) _lang = stored; } catch (_) {}

    const base = './data/';
    const [printersRes, materialsRes, nozzlesRes, envRes, objRes, warnRes, tsRes] =
      await Promise.all([
        fetch(base + 'printers.json'),
        fetch(base + 'materials.json'),
        fetch(base + 'nozzles.json'),
        fetch(base + 'rules/environment.json'),
        fetch(base + 'rules/objective_profiles.json'),
        fetch(base + 'rules/warnings.json'),
        fetch(base + 'rules/troubleshooter.json'),
      ]);

    const [pd, md, nd, ed, od, wd, td] = await Promise.all(
      [printersRes, materialsRes, nozzlesRes, envRes, objRes, warnRes, tsRes].map(r => {
        if (!r.ok) throw new Error(`Failed to load ${r.url} (HTTP ${r.status})`);
        return r.json();
      })
    );

    _printers       = pd.printers;
    _materials      = md.materials;
    _nozzles        = nd.nozzles;
    _envRules       = ed.environment_options;
    _objectives     = od;
    _warnings       = wd;
    _troubleshooter = td;
  }

  // ── Static UI filter arrays (pure UI concerns, not data-driven) ─────────────
  const _USE_CASES = [
    { id: 'prototype',  name: 'Prototype'           },
    { id: 'functional', name: 'Functional part'     },
    { id: 'decorative', name: 'Decorative'          },
    { id: 'miniature',  name: 'Miniature / details' },
    { id: 'large',      name: 'Large part'          },
  ];

  const _SUPPORT_TYPES = [
    { id: 'none',         name: 'None'                                      },
    { id: 'easy_removal', name: 'Easy removal', desc: 'Tree · Z 0.20 mm'   },
    { id: 'quality',      name: 'Quality',      desc: 'Normal · Z 0.12 mm' },
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

  // ── FILTERS — built from loaded JSON + static arrays ────────────────────────
  function getFilters() {
    const printerChips  = _printers.map(p => ({ id: p.id, name: p.name }));
    const nozzleChips   = _nozzles.map(n => ({ id: n.id, name: n.name }));
    const materialChips = _materials.map(m => ({ id: m.id, name: m.name }));
    const surfaceChips  = (_objectives.surface_quality || []).map(s => ({ id: s.id, name: s.name, desc: s.desc }));
    const strengthChips = (_objectives.strength_levels || []).map(s => ({ id: s.id, name: s.name, desc: s.desc }));
    const speedChips    = (_objectives.speed_priority  || []).map(s => ({ id: s.id, name: s.name }));
    const envChips      = _envRules.map(e => ({ id: e.id, name: e.name, desc: e.desc }));

    return [
      { key: 'printer',     label: t('filterPrinter'),  multi: false, required: true,  items: printerChips  },
      { key: 'nozzle',      label: t('filterNozzle'),   multi: false, required: true,  items: nozzleChips   },
      { key: 'material',    label: t('filterMaterial'), multi: false, required: true,  items: materialChips },
      { key: 'useCase',     label: t('filterUseCase'),  multi: true,  required: false, items: [
        { id: 'prototype',  name: t('ucPrototype')  },
        { id: 'functional', name: t('ucFunctional') },
        { id: 'decorative', name: t('ucDecorative') },
        { id: 'miniature',  name: t('ucMiniature')  },
        { id: 'large',      name: t('ucLarge')      },
      ]},
      { key: 'surface',     label: t('filterSurface'),   multi: false, required: false, items: surfaceChips  },
      { key: 'strength',    label: t('filterStrength'),  multi: false, required: false, items: strengthChips },
      { key: 'speed',       label: t('filterSpeed'),     multi: false, required: false, items: speedChips    },
      { key: 'environment', label: t('filterEnv'),       multi: false, required: false, items: envChips      },
      { key: 'support',     label: t('filterSupport'),   multi: false, required: false, items: [
        { id: 'none',         name: t('supNone')                                     },
        { id: 'easy_removal', name: t('supEasy'),    desc: 'Tree · Z 0.20 mm'        },
        { id: 'quality',      name: t('supQuality'), desc: 'Normal · Z 0.12 mm'      },
      ]},
      { key: 'colors',      label: t('filterColors'),   multi: false, required: false, items: [
        { id: 'single',    name: t('colSingle')   },
        { id: 'multi_2_4', name: t('colMulti24')  },
        { id: 'multi_5',   name: t('colMulti5')   },
      ]},
      { key: 'userLevel',   label: t('filterLevel'),    multi: false, required: false, items: [
        { id: 'beginner',     name: t('lvlBeginner'), desc: t('lvlBeginnerDesc') },
        { id: 'intermediate', name: t('lvlInter'),    desc: t('lvlInterDesc')    },
        { id: 'advanced',     name: t('lvlAdvanced'), desc: t('lvlAdvancedDesc') },
      ]},
      { key: 'special',     label: t('filterSpecial'),  multi: true,  required: false, items: [
        { id: 'waterproof',   name: t('spWaterproof') },
        { id: 'high_temp',    name: t('spHighTemp')   },
        { id: 'metallic',     name: t('spMetallic')   },
        { id: 'matte',        name: t('spMatte')      },
        { id: 'glossy',       name: t('spGlossy')     },
        { id: 'uv_resistant', name: t('spUV')         },
      ]},
    ];
  }

  // ── Profile Tabs ─────────────────────────────────────────────────────────────
  // Sections mirror the Bambu Studio Process tab structure and parameter order.
  const PROFILE_TABS = [
    {
      id: 'quality', label: 'Quality',
      sections: [
        { label: 'Layer height',  params: ['layer_height', 'initial_layer_height'] },
        { label: 'Line width',    params: ['outer_wall_line_width', 'inner_wall_line_width', 'top_surface_line_width'] },
        { label: 'Seam',          params: ['seam_position'] },
        { label: 'Precision',     params: ['wall_generator', 'order_of_walls', 'xy_hole_compensation', 'elephant_foot_compensation'] },
        { label: 'Others',        params: ['arc_fitting', 'avoid_crossing_walls', 'only_one_wall_top', 'bridge_flow'] },
      ],
    },
    {
      id: 'strength', label: 'Strength',
      sections: [
        { label: 'Walls',         params: ['wall_loops'] },
        { label: 'Infill',        params: ['sparse_infill_pattern', 'sparse_infill_density', 'infill_combination'] },
        { label: 'Top / bottom',  params: ['top_shell_layers', 'bottom_shell_layers', 'top_surface_pattern', 'bottom_surface_pattern', 'internal_solid_infill_pattern'] },
      ],
    },
    {
      id: 'speed', label: 'Speed',
      sections: [
        { label: 'Speed',         params: ['outer_wall_speed', 'inner_wall_speed', 'initial_layer_speed', 'top_surface_speed', 'gap_fill_speed'] },
        { label: 'Acceleration',  params: ['outer_wall_acceleration', 'inner_wall_acceleration', 'initial_layer_acceleration'] },
      ],
    },
    {
      id: 'support', label: 'Support',
      sections: [
        { label: 'Support',       params: ['support_type', 'support_style', 'support_threshold_angle', 'support_z_distance', 'support_interface_layers', 'support_interface_pattern'] },
      ],
    },
    {
      id: 'others', label: 'Others',
      sections: [
        { label: 'Special',       params: ['prime_tower', 'flush_into_infill', 'ironing', 'slow_down_tall', 'brim_width'] },
      ],
    },
  ];

  // ── Parameter Labels ─────────────────────────────────────────────────────────
  const PARAM_LABELS = {
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
  };

  // ── Data accessors ───────────────────────────────────────────────────────────
  function getPrinter(id)   { return _printers.find(p => p.id === id);                       }
  function getMaterial(id)  { return _materials.find(m => m.id === id);                      }
  function getNozzle(id)    { return _nozzles.find(n => n.id === id);                        }
  function getEnv(id)       { return _envRules.find(e => e.id === id);                       }
  function getSurface(id)   { return (_objectives.surface_quality || []).find(s => s.id === id); }
  function getStrength(id)  { return (_objectives.strength_levels || []).find(s => s.id === id); }
  function getSpeedMode(id) { return (_objectives.speed_priority  || []).find(s => s.id === id); }

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
  function getAdjustedTemps(materialId, environmentId, nozzleId) {
    const mat    = getMaterial(materialId);
    const env    = getEnv(environmentId);
    const nozzle = nozzleId ? getNozzle(nozzleId) : null;
    if (!mat) return { nozzle: '—', bed: '—' };

    const bs           = mat.base_settings;
    const envNozzleAdj = env    ? (env.nozzle_adj || 0) : 0;
    const envBedAdj    = env    ? (env.bed_adj    || 0) : 0;
    const nozzleOffset = nozzle ? (nozzle.temp_offset || 0) : 0;
    const totalNozzle  = envNozzleAdj + nozzleOffset;

    let nozzleStr = `${bs.nozzle_temp_base + totalNozzle} °C`;
    if (totalNozzle > 0) nozzleStr += `  (+${totalNozzle} adj)`;

    let bedStr = `${bs.bed_temp_base + envBedAdj} °C`;
    if (envBedAdj > 0) bedStr += `  (+${envBedAdj} for environment)`;

    return { nozzle: nozzleStr, bed: bedStr };
  }

  // ── Advanced filament settings ────────────────────────────────────────────────
  function getAdvancedFilamentSettings(state) {
    const mat    = getMaterial(state.material);
    const env    = getEnv(state.environment);
    const nozzle = getNozzle(state.nozzle);
    if (!mat) return null;

    const bs           = mat.base_settings;
    const isPETG       = mat.group === 'PETG';
    const nozzleAdj    = (env ? (env.nozzle_adj || 0) : 0) + (nozzle ? (nozzle.temp_offset || 0) : 0);
    const bedAdj       = env ? (env.bed_adj || 0) : 0;

    const initNozzle  = bs.nozzle_temp_base + nozzleAdj + (bs.initial_layer_nozzle_offset || 5);
    const otherNozzle = bs.nozzle_temp_base + nozzleAdj;
    const initBed     = bs.bed_temp_base + bedAdj + (bs.initial_layer_bed_offset || 0) + (isPETG ? 5 : 0);
    const otherBed    = bs.bed_temp_base + bedAdj;

    return {
      initial_layer_temp:     `${initNozzle} °C`,
      other_layers_temp:      `${otherNozzle} °C`,
      initial_layer_bed_temp: `${initBed} °C`,
      other_layers_bed_temp:  `${otherBed} °C`,
      cooling_fan_min:        bs.cooling_fan_min,
      cooling_fan_overhang:   bs.cooling_fan_overhang,
      slow_layer_time:        bs.slow_layer_time,
      pressure_advance:       String(bs.pressure_advance ?? '—'),
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

    // 1. Material-level warnings from JSON data
    (material.warnings || []).forEach(w => warnings.push(w));

    // 2. Enclosure requirement on open printer
    if (material.enclosure_required && printer && printer.enclosure === 'none') {
      warnings.push(`<strong>${printer.name} is an open-frame printer.</strong> ${material.name} requires a fully enclosed printer. High warping risk — consider PLA or PETG instead.`);
    }

    // 3. PETG + open printer
    if (material.group === 'PETG' && printer && printer.enclosure === 'none') {
      warnings.push(`<strong>${printer.name} has no enclosure.</strong> PETG prints better with stable ambient temperature. Consider a DIY enclosure or warm room to avoid layer separation.`);
    }

    // 4. PLA + passive enclosure (heat creep warning)
    if (material.group === 'PLA' && printer && printer.enclosure === 'passive' &&
        material.enclosure_behavior?.open_door_threshold_bed_temp != null) {
      warnings.push(`<strong>PLA + enclosed printer:</strong> Open the front door and remove the top glass panel to prevent heat creep and potential clogs.`);
    }

    // 5. CF/GF material + non-hardened nozzle
    if (material.nozzle_requirements?.material === 'hardened' && nozzle && !nozzle.hardened) {
      warnings.push(`<strong>Wrong nozzle for ${material.name}.</strong> A hardened steel nozzle is required — carbon fibers will destroy standard nozzles within hours.`);
    }

    // 6. CF material + 0.2mm nozzle
    if (material.nozzle_requirements?.min_diameter > 0.2 && nozzle && nozzle.size < material.nozzle_requirements.min_diameter) {
      warnings.push(`<strong>Nozzle too small for ${material.name}.</strong> Minimum ${material.nozzle_requirements.min_diameter}mm required — 0.2mm nozzle will clog immediately.`);
    }

    // 7. AMS on TPU
    if (material.group === 'TPU' && !material.ams_compatible && colors && colors !== 'single') {
      warnings.push(`<strong>TPU is not AMS compatible.</strong> Load TPU from the rear spool holder directly into the extruder.`);
    }

    // 8. Special requirement warnings
    if (special.includes('high_temp') && material.properties.heat_resistance_celsius < 70) {
      warnings.push(`<strong>${material.name} softens at ~${material.properties.heat_resistance_celsius}°C.</strong> For parts above 60°C, switch to PETG (69°C), ASA (~100°C), or ABS (~98°C).`);
    }
    if (special.includes('uv_resistant') && !material.properties.uv_resistant) {
      warnings.push(`<strong>UV resistance:</strong> ${material.name} degrades in prolonged sunlight. Consider ASA for outdoor applications.`);
    }
    if (special.includes('metallic') && nozzle && !nozzle.hardened) {
      warnings.push(`<strong>Metallic / abrasive filaments</strong> require a hardened steel nozzle — standard nozzles wear rapidly.`);
    }
    if (special.includes('waterproof')) {
      warnings.push(`<strong>For waterproofing:</strong> set wall loops to 4+ and infill to 60%+. PETG has better moisture and chemical resistance than PLA.`);
    }
    if (special.includes('glossy') && material.id !== 'pla_silk') {
      warnings.push(`<strong>Glossy / Silk:</strong> PLA Silk produces the best gloss results. Slow outer wall to 40–50 mm/s and use fine layer height.`);
    }
    if (special.includes('matte') && material.id !== 'pla_matte') {
      warnings.push(`<strong>Matte finish:</strong> PLA Matte is designed for this — consider switching material for best results.`);
    }

    // 9. AMS incompatibility
    if (colors && colors !== 'single' && !material.ams_compatible) {
      warnings.push(`<strong>${material.name} is not AMS compatible.</strong> Multi-color printing requires an AMS-compatible filament.`);
    }

    // 10. Beginner + advanced materials
    if (state.userLevel === 'beginner' && ['ABS', 'ASA', 'PVA', 'PA', 'PC'].includes(material.group)) {
      warnings.push(`<strong>Advanced material selected.</strong> ${material.name} requires experience and specific hardware. Consider starting with PLA Basic or PETG Basic.`);
    }

    // 11. Environment warnings from JSON
    const env = getEnv(state.environment);
    if (env && env.warnings) env.warnings.forEach(w => warnings.push(w));

    // 12. Creality printer — no multi-color system
    if (printer && printer.manufacturer === 'creality' &&
        (!printer.multi_color_systems || printer.multi_color_systems.length === 0) &&
        colors && colors !== 'single') {
      warnings.push(`<strong>${printer.name} has no multi-color system.</strong> This printer requires manual filament swaps for color changes. Automatic color printing is not supported.`);
    }

    // 13. K2 Plus CFS note for multi-color — different system from Bambu AMS
    if (printer && printer.id === 'k2_plus' && colors && colors !== 'single') {
      warnings.push(`<strong>K2 Plus uses Creality CFS, not Bambu AMS.</strong> Configure purge volumes in Creality Print software — Bambu Studio AMS settings do not apply.`);
    }

    // 14. Printer max nozzle temp too low for material
    if (printer && printer.max_nozzle_temp != null && printer.max_nozzle_temp < material.base_settings.nozzle_temp_base) {
      warnings.push(`<strong>${printer.name} max nozzle temp is ${printer.max_nozzle_temp}°C.</strong> ${material.name} requires ${material.base_settings.nozzle_temp_base}°C minimum. An all-metal hot end upgrade is required.`);
    }

    // 15. PA / PC + active chamber heating tip
    if (printer && printer.active_chamber_heating && ['PA', 'PC'].includes(material.group)) {
      warnings.push(`<strong>Active chamber heating on ${printer.name} is ideal for ${material.name}.</strong> Set chamber temp to ${material.group === 'PC' ? '45' : '40'}°C before starting — this dramatically reduces warping and delamination.`);
    }

    // 16. PA strongly recommended enclosure — on open printer
    if (material.enclosure_behavior?.enclosure_strongly_recommended && printer && printer.enclosure === 'none') {
      warnings.push(`<strong>${printer.name} is open-frame.</strong> ${material.name} warps significantly without enclosure. Use a brim of 10mm+ and print in a draught-free, warm room. Consider an enclosure upgrade.`);
    }

    return warnings;
  }

  // ── Main profile resolver ─────────────────────────────────────────────────────
  function resolveProfile(state) {
    const printer   = getPrinter(state.printer);
    const material  = getMaterial(state.material);
    const nozzle    = getNozzle(state.nozzle);
    if (!printer || !material) return {};

    const surface   = getSurface(state.surface);
    const strength  = getStrength(state.strength);
    const speedMode = getSpeedMode(state.speed);
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

    const p = {};

    // ─── QUALITY TAB ──────────────────────────────────────────────────────────
    if (surface) {
      p.layer_height = S(`${surface.layer_height} mm`,
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

      if (surface.seam_aligned) {
        p.seam_position = S('Aligned (or Back)',
          'At fine quality, the seam is more visible. Placing it consistently at one location makes it easy to hide or orient away from view.');
      }

      p.initial_layer_height = A('0.20 mm',
        'A slightly thicker initial layer improves bed adhesion by increasing squish and contact area, regardless of the chosen surface quality.');

      const ow = (nozzleSize * 1.05).toFixed(2);
      const iw = (nozzleSize * 1.10).toFixed(2);
      p.outer_wall_line_width  = A(`${ow} mm`, 'Slightly wider than nozzle diameter — improves surface quality and wall strength with minimal speed penalty.');
      p.inner_wall_line_width  = A(`${iw} mm`, 'Wider inner walls print faster while maintaining structural integrity.');
      p.top_surface_line_width = A(`${ow} mm`, 'Matching the outer wall width gives a consistent, uniform top surface appearance.');

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

      p.sparse_infill_pattern = S(strength.infill_pattern,
        strength.infill_pattern === 'Gyroid'
          ? 'Gyroid provides uniform strength in all three axes. The nozzle never crosses existing infill lines in the same layer, reducing pressure spikes.'
          : strength.infill_pattern === 'Grid'
            ? 'Grid is efficient and strong in the XY plane. A solid default for most everyday parts.'
            : 'Cross Hatch is the fastest infill to print. Adequate for prototypes where strength is not the priority.');

      p.sparse_infill_density = S(`${strength.infill_density}%`, '');

      const lowInfill  = strength.infill_density <= 15;
      const fineLayers = surface && surface.layer_height <= 0.15;
      const topShells  = fineLayers ? 6 : lowInfill ? 5 : (strength.top_shell_layers_base || 5);
      p.top_shell_layers = S(`${topShells}`,
        topShells >= 5
          ? 'More top shells prevent pillowing (small holes in the top face) — common at low infill densities or with fine layer heights.'
          : '');

      const bottomShells = strength.bottom_shell_layers_base || Math.max(3, topShells - 1);
      p.bottom_shell_layers = A(`${bottomShells}`,
        'Solid bottom shells form the base of the print. More shells improve the first-layer surface quality visible on the underside.');

      const isFineQuality = surface && (surface.id === 'fine' || surface.id === 'maximum');
      p.top_surface_pattern = A(
        isFineQuality ? 'Monotonic line' : 'Monotonic',
        'Monotonic line produces the smoothest top surface — each line always starts where the previous ended, eliminating gaps and improving gloss.');

      p.bottom_surface_pattern       = A('Monotonic', 'Monotonic bottom surface pattern ensures complete coverage on the first visible layers.');
      p.internal_solid_infill_pattern = A('Auto (Rectilinear)', 'Rectilinear is the fastest pattern for solid infill. Auto selects the optimal angle per layer.');

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

      // TPU hard speed cap — flexible filament must be slow
      if (isTPU) {
        outerSpeed = Math.min(outerSpeed, 40);
        innerSpeed = Math.min(innerSpeed, 50);
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

      // MVS speed cap from material JSON data
      const mat_bs = material.base_settings;
      if (mat_bs.max_mvs && nozzle) {
        const mvsStr = mat_bs.max_mvs[String(nozzleSize)];
        if (mvsStr) {
          const mvs = parseFloat(mvsStr);
          const defaultLineWidth = nozzleSize * 1.05;
          const layerH = surface ? surface.layer_height : 0.2;
          const mvsSpeedCap = Math.floor(mvs / (defaultLineWidth * layerH));
          outerSpeed = Math.min(outerSpeed, mvsSpeedCap);
          innerSpeed = Math.min(innerSpeed, Math.floor(mvsSpeedCap * 1.4));
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

      p.outer_wall_speed = S(`${outerSpeed} mm/s`,
        isTPU      ? 'TPU must print slowly — flexible filament stretches during fast moves causing under-extrusion and jams.' :
        isABSlike  ? 'Slower outer walls reduce warping risk by allowing each layer more time to cool gradually.' :
        !isCoreXY  ? 'A1/A1 Mini have a 10,000 mm/s² acceleration limit — higher speeds cause ringing on tall prints.' :
        petgCapped ? 'PETG surface quality degrades noticeably above 80 mm/s outer wall speed — capped for this material.' :
        sm.id === 'quality' ? 'Slow outer walls reduce vibration artifacts and give each layer more time to solidify uniformly.' : '');

      p.inner_wall_speed = S(`${innerSpeed} mm/s`, '');

      // Advanced speed settings
      let initSpeed = isCoreXY ? sm.initial_layer : (sm.initial_layer - 5);
      if (isTPU)    initSpeed = Math.min(initSpeed, 20);
      if (isABSlike) initSpeed = Math.min(initSpeed, 25);
      const initSpeedFinal = env ? Math.round(initSpeed * (env.first_layer_speed_multiplier || 1.0)) : initSpeed;

      p.initial_layer_speed = A(`${initSpeedFinal} mm/s`,
        'Slow initial layer speed gives the filament more time to bond with the bed surface and build a solid foundation.');

      const topSpeed = isCoreXY ? sm.top_surface_corexy : sm.top_surface_bedslinger;
      p.top_surface_speed = A(`${topSpeed} mm/s`,
        sm.id === 'quality' ? 'Slow top surface speed produces the most uniform and flat top layer — critical when ironing is enabled.' : '');

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

      if (isTPU) { outerAccel = Math.min(outerAccel, 500); innerAccel = Math.min(innerAccel, 800); }

      p.outer_wall_acceleration    = A(`${outerAccel} mm/s²`,
        isTPU     ? 'Very low acceleration for TPU — prevents filament stretching and under-extrusion.' :
        !isCoreXY ? 'Lower acceleration on A1/A1 Mini prevents ringing from the moving print bed mass.' :
        isABSlike ? 'Reduced acceleration helps ABS/ASA cool more uniformly, reducing warping.' : '');
      p.inner_wall_acceleration    = A(`${innerAccel} mm/s²`, '');
      p.initial_layer_acceleration = A(`${initAccel} mm/s²`,
        'Very low acceleration ensures the nozzle moves smoothly at slow speed — prevents the first layer from being dragged or lifting at corners.');
    }

    // ─── SUPPORT TAB ──────────────────────────────────────────────────────────
    const support = _SUPPORT_TYPES.find(s => s.id === state.support);
    if (support && support.id !== 'none') {
      const isEasy = support.id === 'easy_removal';
      const forceEasy = isBeginnerMode; // beginners always get easy-removal supports

      p.support_type            = S(isEasy || forceEasy ? 'Tree' : 'Normal',
        isEasy || forceEasy
          ? 'Tree supports contact the model at minimal points and are significantly easier to remove without surface damage.'
          : 'Normal supports provide better surface quality on the underside of supported areas — use when finish matters.');
      p.support_style           = S(isEasy || forceEasy ? 'Tree Hybrid' : 'Default', '');
      p.support_threshold_angle = S(isEasy ? '40°' : '30°',
        'Only generate support where overhangs exceed this angle. Lower values generate more support — use 30° for quality-critical surfaces.');
      p.support_z_distance      = S(isEasy ? '0.20 mm' : '0.12 mm',
        isEasy
          ? 'Larger Z gap makes support easy to snap off. Expect slight surface marks on the underside of supported areas.'
          : 'Tighter Z distance produces cleaner supported surfaces at the cost of harder removal.');

      p.support_interface_layers  = A(isEasy ? '2' : '3',
        'Interface layers are solid layers between the support and model surface — more layers = better surface finish on the supported face, but harder to remove.');
      p.support_interface_pattern = A(isEasy ? 'Rectilinear' : 'Grid',
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

    if (surface && surface.ironing) {
      p.ironing = S('Enabled — Monotonic line',
        'Ironing re-passes the nozzle over the top surface at low speed to melt and flatten bumps, producing a near-glossy flat finish.');
    }

    if (isLarge && !isCoreXY) {
      p.slow_down_tall = S('Enabled (recommended)',
        'On A1/A1 Mini the bed moves — tall prints amplify vibration as mass increases. Slowing top layers significantly reduces ringing artifacts.');
    }

    // Brim logic — beginner always gets brim, others based on part type + material
    const needsBrim = isFunctional || isLarge || special.includes('high_temp') || isBeginnerMode || isABSlike || isPA || isPC;
    if (needsBrim) {
      const brimSize = (isPA || isPC) ? '8–12 mm' : '5–8 mm';
      p.brim_width = A(brimSize,
        isPC         ? 'PC shrinks significantly — a wide brim is essential to prevent corner lift and delamination.' :
        isPA         ? 'PA (Nylon) has high shrinkage — always use a brim to prevent warping, especially on larger parts.' :
        isABSlike    ? 'Essential for ABS/ASA — these materials warp severely at corners without a brim.' :
        isBeginnerMode ? 'Beginner tip: a brim dramatically improves first-layer success rate for any material.' :
        'A brim prevents corners and thin features from lifting off the bed during printing.');
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

  // ── Profile export ───────────────────────────────────────────────────────────
  // Returns a clean flat object mapping Bambu Studio parameter names to values
  function exportProfile(state) {
    const printer  = getPrinter(state.printer);
    const material = getMaterial(state.material);
    const nozzle   = getNozzle(state.nozzle);
    const env      = getEnv(state.environment);
    if (!printer || !material || !nozzle) return null;

    const profile  = resolveProfile(state);
    const temps    = getAdjustedTemps(state.material, state.environment, state.nozzle);
    const adv      = getAdvancedFilamentSettings(state);

    // Flatten profile — take the .value from each param object
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
        note:          'This file is a settings reference for Bambu Studio. Values are recommendations — enter them manually into the corresponding Bambu Studio tabs.',
      },
      filament: {
        nozzle_temperature:              adv?.initial_layer_temp   ?? null,
        nozzle_temperature_other_layers: adv?.other_layers_temp    ?? null,
        bed_temperature:                 adv?.initial_layer_bed_temp ?? null,
        bed_temperature_other_layers:    adv?.other_layers_bed_temp  ?? null,
        cooling_fan_speed:               material.base_settings.cooling_fan,
        cooling_fan_speed_min:           material.base_settings.cooling_fan_min,
        max_volumetric_speed:            material.base_settings.max_mvs?.[String(nozzle.size)] ?? null,
        pressure_advance:                material.base_settings.pressure_advance,
        flow_ratio:                      material.base_settings.flow_ratio,
        retraction_length:               `${material.base_settings.retraction_length} mm`,
        retraction_speed:                `${material.base_settings.retraction_speed} mm/s`,
        build_plate:                     material.build_plate_display,
        drying:                          material.drying.display,
        enclosure:                       getEnclosureDisplay(material),
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
    get PROFILE_TABS() {
      const cap = s => s[0].toUpperCase() + s.slice(1);
      return PROFILE_TABS.map(tab => ({
        ...tab,
        label: t('tab' + cap(tab.id)),
        params: tab.sections.flatMap(s => s.params),
      }));
    },
    get PARAM_LABELS() { return PARAM_LABELS; },
    resolveProfile,
    getWarnings,
    getAdvancedFilamentSettings,
    getAdjustedTemps,
    getFilamentProfile,
    getChecklist,
    getNozzle,
    getMaterial,
    getPrinter,
    isNozzleCompatibleWithMaterial,
    getSymptoms,
    getTroubleshootingTips,
    exportProfile,
    calcPurgeVolumes,
    calcPrintTime,
    setLang,
    getLang,
    t,
  };
})();
