// ─── 3D Print Assistant — App (UI only) ──────────────────────────────────────
// No business logic here. All logic lives in engine.js.
// When the API is built, engine.js moves server-side and app.js changes URLs only.

// ── Analytics ─────────────────────────────────────────────────────────────────
function track(name, props) {
  try {
    if (localStorage.getItem('3dpa_notrack') === '1') return;
    const body = JSON.stringify({
      event: name,
      properties: {
        ...analyticsBaseProps(),
        ...(props || {}),
      },
    });
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/analytics', blob)) return;
    }
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch (_) {}
}

function analyticsBaseProps() {
  const meta = document.querySelector('meta[name="app-version"]');
  const host = window.location.hostname;
  let channel = 'production';
  if (host === 'localhost' || host === '127.0.0.1' || host === '') {
    channel = 'local';
  } else if (host.endsWith('.pages.dev')) {
    channel = 'preview';
  }
  return {
    platform: 'web',
    channel,
    appVersion: (meta && meta.content) || '',
    locale: navigator.language || '',
  };
}

function analyticsSelectionProps() {
  const printer = state.printer ? Engine.getPrinter(state.printer) : null;
  const material = state.material ? Engine.getMaterial(state.material) : null;
  return {
    printerBrand: printer?.manufacturer || '',
    printerModel: state.printer || '',
    printerSeries: printer?.series_group || printer?.series || '',
    material: state.material || '',
    materialGroup: material?.group || '',
    nozzle: state.nozzle || '',
    environment: state.environment || 'normal',
    support: state.support || 'none',
    colors: state.colors || 'single',
    profileMode: state.profileMode || 'safe',
    outputMode: currentMode,
    slicer: state.printer ? Engine.getSlicerForPrinter(state.printer) : '',
  };
}

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  printer: null, nozzle: null, material: null,
  useCase: [], surface: null, strength: null, speed: null,
  environment: null, support: null, colors: null,
  userLevel: null, special: [],
  seam: null, brim: null, build_plate: null,
  extruder_type: null, filament_condition: null, ironing: null,
  // [IMPL-041 / DQ-2] Safe vs Tuned profile tier. null → engine coerces to
  // 'safe' — zero behavior change for users who never open the Profile Mode
  // section. 'tuned' opts into community-validated aggressive values.
  profileMode: null,
};

let currentMode       = 'simple';        // 'simple' | 'advanced'
const expandedSections = new Set();      // tracks which filters have been expanded via "+N more"
let currentTheme      = 'dark';          // 'dark' | 'light'
let activeTabId       = 'quality';       // persisted across re-renders
let currentView       = 'configure';     // 'configure' | 'troubleshoot' | 'workshop' | 'feedback'
let activeSymptom     = null;            // troubleshooter selected symptom id
let comparisonProfile = null;            // { profile, label } when Profile A is locked
let _lastTrackedProfileKey = null;       // deduplicates profile_generated events
let pickerBrand       = null;            // currently expanded brand in printer picker
let pickerShowMore    = false;           // whether secondary brands are visible
let pickerCollapsed   = false;           // auto-collapse picker after printer selected + other filter clicked

// Print time estimator state
const ptState = { height: 50, width: 50, depth: 50, walls: 3, infill: 15 };


// ── Modal content (About + Disclaimer) ───────────────────────────────────────
const MODAL_CONTENT = {
  about: {
    en: {
      title: 'About 3D Print Assistant',
      body: `<p>3D Print Assistant was built by an amateur 3D printing enthusiast who couldn't find a simple, structured tool for getting started with print settings — so decided to build one. It translates your printer, nozzle, material, and print goals into optimized starting settings for your slicer.</p>
             <p>The tool supports <strong>74 printers</strong> across 14 brands — including Bambu Lab, Creality, Prusa, Anycubic, QIDI, Voron, and more — with slicer-specific output for <strong>Bambu Studio</strong>, <strong>OrcaSlicer</strong>, and <strong>PrusaSlicer</strong>. Settings match the structure of your slicer's tabs so you can apply them directly.</p>
             <p>Settings are built from a hybrid of community knowledge, hands-on experience, and manufacturer defaults — a database that is still learning and being refined. This is a <strong>beta project</strong>. All recommendations are a starting point for your own experimentation, not a guarantee.</p>`,
    },
    da: {
      title: 'Om 3D Print Assistant',
      body: `<p>3D Print Assistant er bygget af en amatør 3D-print-entusiast, der ikke kunne finde et simpelt, struktureret værktøj til at komme i gang med printindstillinger — og derfor besluttede at bygge et. Det oversætter din printer, dyse, materiale og printmål til optimerede startindstillinger til din slicer.</p>
             <p>Værktøjet understøtter <strong>74 printere</strong> fra 14 mærker — inkl. Bambu Lab, Creality, Prusa, Anycubic, QIDI, Voron m.fl. — med slicer-specifikt output til <strong>Bambu Studio</strong>, <strong>OrcaSlicer</strong> og <strong>PrusaSlicer</strong>. Indstillingerne matcher strukturen i din slicers faner, så du kan anvende dem direkte.</p>
             <p>Indstillingerne er bygget på en kombination af community-viden, praktisk erfaring og fabrikanternes standarder — en database der stadig lærer og justeres. Dette er et <strong>betaprojekt</strong>. Alle anbefalinger er et udgangspunkt for din egen eksperimentering, ikke en garanti.</p>`,
    },
  },
  disclaimer: {
    en: {
      title: 'Disclaimer',
      body: `<p>All settings recommended by 3D Print Assistant are suggestions based on community experience and general best practices for the selected printer, nozzle, and material combination.</p>
             <p>They are not guaranteed to work for your specific setup. Factors like printer calibration, ambient conditions, filament brand variation, and hardware wear can all affect results.</p>
             <p>Always test with a small print before committing to a long job. We accept no responsibility for failed prints, wasted filament, or any damage to equipment resulting from use of these suggestions.</p>`,
    },
    da: {
      title: 'Ansvarsfraskrivelse',
      body: `<p>Alle indstillinger anbefalet af 3D Print Assistant er forslag baseret på community-erfaring og generelle bedste praksisser for den valgte kombination af printer, dyse og materiale.</p>
             <p>De er ikke garanteret til at fungere for dit specifikke setup. Faktorer som printerkalibrering, omgivelsesforhold, filamentmærkevariation og hardwareforringelse kan alle påvirke resultaterne.</p>
             <p>Test altid med et lille print, inden du starter et langt job. Vi accepterer intet ansvar for mislykkede prints, spildt filament eller skader på udstyr som følge af brug af disse forslag.</p>`,
    },
  },
};

// ── Roadmap data — community-requested features ─────────────────────────────
const ROADMAP_FEATURES = [
  { icon: '◈', en: 'Copy individual setting value to clipboard',         da: 'Kopiér individuel indstillingsværdi til udklipsholder' },
  { icon: '◇', en: 'Copy all settings as formatted text',                da: 'Kopiér alle indstillinger som formateret tekst' },
  { icon: '⇌', en: 'Shareable profile URL',                              da: 'Delbar profil-URL' },
  { icon: 'ⓘ', en: 'Parameter info tooltips — what each setting does',   da: 'Parameter info-tooltips — hvad hver indstilling gør' },
  { icon: '☀', en: 'Auto dark/light mode from OS preference',            da: 'Automatisk mørk/lys tilstand fra OS-præference' },
  { icon: '⚠', en: 'Expandable warning explanations',                    da: 'Udvidelige advarselsforklaringer' },
  { icon: '⊕', en: 'More materials (PLA+, PA12-CF, PPA-CF, ABS-GF)',    da: 'Flere materialer (PLA+, PA12-CF, PPA-CF, ABS-GF)' },
  { icon: '★', en: 'Saved presets (local storage)',                       da: 'Gemte presets (lokal lagring)' },
  { icon: '↓', en: 'Export as Bambu Studio .json import file',           da: 'Eksportér som Bambu Studio .json importfil' },
  { icon: '🌐', en: 'More languages (DE, NL, SV)',                       da: 'Flere sprog (DE, NL, SV)' },
];

function openModal(key) {
  const lang    = Engine.getLang();

  if (key === 'roadmap') {
    document.getElementById('modalTitle').textContent = lang === 'da' ? 'Ønskede funktioner' : 'Community Requested Features';
    const subtitle = lang === 'da'
      ? 'Funktioner ønsket af community — stem via feedback-siden!'
      : 'Features requested by the community — vote via the feedback page!';
    const listHtml = ROADMAP_FEATURES.map(f =>
      `<li class="roadmap-item"><span class="roadmap-icon">${f.icon}</span> ${f[lang] || f.en}</li>`
    ).join('');
    document.getElementById('modalBody').innerHTML =
      `<p class="roadmap-subtitle">${subtitle}</p><ul class="roadmap-list">${listHtml}</ul>`;
    document.getElementById('infoModal').showModal();
    return;
  }

  const content = MODAL_CONTENT[key][lang] || MODAL_CONTENT[key].en;
  document.getElementById('modalTitle').textContent  = content.title;
  document.getElementById('modalBody').innerHTML     = content.body;
  document.getElementById('infoModal').showModal();
}

// ── Boot — wait for engine to load all JSON data before building UI ───────────
Engine.init()
  .then(() => {
    // Restore theme before first render to avoid flash
    try {
      const savedTheme = localStorage.getItem('3dpa_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') applyTheme(savedTheme, false);
    } catch (_) {}
    const restored = restoreInitialState();
    bindControls();
    applyLang();
    // Only storage restores get the notice — a shared URL opening exactly as
    // sent is the expected behavior, not a "restored" surprise.
    if (restored === 'storage') showToast(Engine.t('restoredNotice'));
    track('app_opened');
  })
  .catch(err => {
    console.error('Engine init failed:', err);
    document.getElementById('emptyState').innerHTML =
      '<div class="empty-icon">⚠</div><div class="empty-title">Failed to load data</div><div class="empty-sub">Check your connection and reload the page.</div>';
  });

// ── Theme toggle ─────────────────────────────────────────────────────────────
function applyTheme(theme, persist = true) {
  currentTheme = theme;
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = theme === 'dark' ? '☀' : '☾';
  if (persist) try { localStorage.setItem('3dpa_theme', theme); } catch (_) {}
}

// ── Session persistence (IMPL-042 Phase A) ───────────────────────────────────
// Serialize app state via StateCodec on every render; restore on boot after
// Engine.init() so unknown ids can degrade against the live catalogs.
function persistState() {
  try { localStorage.setItem('3dpa_state_v1', StateCodec.encodeForStorage(state)); } catch (_) {}
}

function restorePersistedState() {
  let raw = null;
  try { raw = localStorage.getItem('3dpa_state_v1'); } catch (_) { return false; }
  if (!raw) return false;
  const decoded = StateCodec.decodeFromStorage(raw);
  if (!decoded) return false;
  applyRestoredState(StateCodec.validateState(decoded, Engine));
  return !!(state.printer || state.material || state.nozzle);
}

function applyRestoredState(clean) {
  Object.keys(clean).forEach(k => { state[k] = clean[k]; });
  Engine.setActiveSlicer(state.printer ? Engine.getSlicerForPrinter(state.printer) : 'bambu_studio');
  pickerCollapsed = !!state.printer;
}

// ── Shareable URLs (IMPL-042 Phase B) ────────────────────────────────────────
// URL params take precedence over localStorage; invalid ids degrade the same
// way. Returns 'url' | 'storage' | false so boot can pick the right notice.
function restoreInitialState() {
  const fromUrl = StateCodec.decodeFromParams(window.location.search);
  if (Object.keys(fromUrl).length > 0) {
    applyRestoredState(StateCodec.validateState(fromUrl, Engine));
    return 'url';
  }
  return restorePersistedState() ? 'storage' : false;
}

// Keep the address bar in sync with the selection so every configured view is
// bookmarkable by default; replaceState avoids history spam.
function syncUrl() {
  try {
    const qs = StateCodec.encodeToParams(state);
    history.replaceState(null, '', qs ? `${location.pathname}?${qs}` : location.pathname);
  } catch (_) {}
}

// Copy a URL reproducing the given state object; toast on success. Clipboard
// API first, execCommand textarea fallback for blocked/legacy contexts.
function copyShareUrl(stateObj) {
  const qs  = StateCodec.encodeToParams(stateObj);
  const url = `${location.origin}${location.pathname}${qs ? '?' + qs : ''}`;
  const copyFallback = () => {
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
    if (ok) showToast(Engine.t('shareCopied'));
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => showToast(Engine.t('shareCopied')))
      .catch(copyFallback);
  } else {
    copyFallback();
  }
}

// ── Toast — small transient notice (restored session, link copied) ───────────
let _toastTimer = null;
function showToast(msg) {
  let t = document.getElementById('appToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'appToast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  clearTimeout(_toastTimer);
  requestAnimationFrame(() => t.classList.add('visible'));
  _toastTimer = setTimeout(() => t.classList.remove('visible'), 2600);
}

// ── Apply current language to all static UI text ──────────────────────────────
function applyLang() {
  const T = Engine.t;
  const lang = Engine.getLang();

  // Header / nav
  document.getElementById('logoText').textContent          = T('logoText');
  document.getElementById('logoSub').textContent           = T('logoSub');
  document.getElementById('modeSimple').textContent        = T('modeSimple');
  document.getElementById('modeAdvanced').textContent      = T('modeAdvanced');
  document.getElementById('resetBtn').textContent          = T('reset');
  document.getElementById('navConfigure').textContent      = T('navConfigure');
  document.getElementById('navTroubleshoot').textContent   = T('navTroubleshoot');
  document.getElementById('navWorkshop').textContent       = T('navWorkshop');
  document.getElementById('navFeedback').textContent       = T('navFeedback');
  document.getElementById('navIOS').textContent            = T('navIOS') + ' ↗';

  // Lang toggle active state
  document.getElementById('langEN').classList.toggle('active', lang === 'en');
  document.getElementById('langDA').classList.toggle('active', lang === 'da');

  // Empty state
  document.getElementById('emptyTitle').textContent = T('emptyTitle');
  document.getElementById('emptySub').textContent   = T('emptySub');

  // Heroes
  document.getElementById('troubleHeroTitle').textContent   = T('troubleTitle');
  document.getElementById('troubleHeroSub').textContent     = T('troubleSub');
  document.getElementById('feedbackHeroTitle').textContent      = T('feedbackTitle');
  document.getElementById('feedbackHeroSub').textContent        = T('feedbackSub');
  document.getElementById('feedbackCardBugTitle').textContent   = T('feedbackBugTitle');
  document.getElementById('feedbackCardBugDesc').textContent    = T('feedbackBugDesc');
  document.getElementById('feedbackCardFeatureTitle').textContent = T('feedbackFeatTitle');
  document.getElementById('feedbackCardFeatureDesc').textContent  = T('feedbackFeatDesc');
  document.getElementById('feedbackCardOtherTitle').textContent = T('feedbackOtherTitle');
  document.getElementById('feedbackCardOtherDesc').textContent  = T('feedbackOtherDesc');

  // Panel headers
  document.getElementById('panelFilTitle').textContent  = T('panelFilTitle');
  document.getElementById('panelFilSub').textContent    = T('panelFilSub');
  document.getElementById('panelProfTitle').textContent = T('panelProfTitle');
  document.getElementById('panelProfSub').textContent   = T('panelProfSub');

  // Buttons that live in the header area
  // Export buttons text handled dynamically in renderProfilePanel
  const lockBtn = document.getElementById('compareLockBtn');
  if (lockBtn) lockBtn.textContent = comparisonProfile ? T('compareClear') : T('compareBtn');
  const shareBtnEl = document.getElementById('shareBtn');
  if (shareBtnEl) shareBtnEl.textContent = T('shareBtn');
  const saveBtnEl = document.getElementById('saveProfileBtn');
  if (saveBtnEl) saveBtnEl.textContent = T('saveProfileBtn');

  // Workshop static text + list re-render for language
  document.getElementById('workshopHeroTitle').textContent = T('workshopTitle');
  document.getElementById('workshopHeroSub').textContent   = T('workshopSub');
  document.getElementById('wsExportBtn').textContent       = T('wsExport');
  document.getElementById('wsImportBtn').textContent       = T('wsImport');
  document.getElementById('nameModalSave').textContent     = T('nameModalSaveBtn');
  document.getElementById('outcomeWorkedBtn').textContent  = T('outcomeWorked');
  document.getElementById('outcomeFailedBtn').textContent  = T('outcomeFailed');
  document.getElementById('outcomeSymptomsLabel').textContent = T('outcomeSymptomsLabel');
  document.getElementById('outcomeModalSave').textContent  = T('nameModalSaveBtn');
  renderWorkshop();

  // Footer
  const footerEl = document.getElementById('footerText');
  footerEl.innerHTML = `${T('footer')} &middot; <button class="about-link" id="roadmapBtn">${T('roadmapLink')}</button> &middot; <button class="about-link" id="aboutBtn">${T('aboutLink')}</button> &middot; <button class="about-link" id="disclaimerFooterBtn">${T('disclaimerLink')}</button> &middot; <a class="about-link" href="/privacy">Privacy</a>`;
  document.getElementById('roadmapBtn').addEventListener('click', () => openModal('roadmap'));
  document.getElementById('aboutBtn').addEventListener('click', () => openModal('about'));
  document.getElementById('disclaimerFooterBtn').addEventListener('click', () => openModal('disclaimer'));

  // Rebuild filters with translated labels + re-sync selections
  buildFilters();
  restoreChipSelections();

  // Rebuild troubleshooter symptoms grid with translated names
  const grid = document.getElementById('symptomGrid');
  grid.innerHTML = '';
  buildTroubleshooter();
  if (activeSymptom) {
    document.querySelectorAll('.symptom-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.id === activeSymptom);
    });
  }

  // Re-render everything with new language
  render();
  renderTroubleshooter();

  // If the feedback modal is open, re-render its strings
  if (window.FeedbackForm && typeof window.FeedbackForm.refreshLang === 'function') {
    window.FeedbackForm.refreshLang();
  }
}

// ── Printer Picker (brand → model) ──────────────────────────────────────────
function buildPrinterPicker(container, filter) {
  const T = Engine.t;
  const section = document.createElement('div');
  section.className = 'filter-section';
  section.id = 'printerPickerSection';
  section.innerHTML = `
    <div class="filter-row">
      <div class="filter-label-col">
        <div>
          <span class="filter-section-label" data-count="">${filter.label}</span>
          <span class="filter-hint">${T('hintRequired')}</span>
        </div>
        <span class="filter-toggle">▼</span>
      </div>
      <div class="printer-picker-body">
        <div class="printer-summary" id="printerSummary">
          <span id="printerSummaryText"></span>
          <button class="printer-clear-btn" title="Clear selection">&times;</button>
        </div>
        <button class="start-over-link" id="startOverBtn">${T('startOver')}</button>
        <div class="printer-search-wrap">
          <span class="printer-search-icon">&#x1F50D;</span>
          <input class="printer-search-input" id="printerSearchInput" type="text"
                 placeholder="Search printers..." autocomplete="off"/>
        </div>
        <div class="printer-search-results" id="printerSearchResults">
          <div class="printer-search-results-inner" id="printerSearchResultsInner"></div>
        </div>
        <div class="chips printer-brands" id="chips_printer"></div>
        <div class="printer-model-panel" id="printerModelPanel">
          <div class="printer-model-panel-inner" id="printerModelPanelInner"></div>
        </div>
      </div>
    </div>`;
  container.appendChild(section);

  // Wire collapse toggle
  section.querySelector('.filter-label-col').addEventListener('click', () => {
    section.classList.toggle('collapsed');
  });

  // Wire clear button
  section.querySelector('.printer-clear-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    clearPrinterSelection();
  });

  // Wire "Start over" — full reset, so restored state never feels sticky
  // (IMPL-042 Phase A)
  document.getElementById('startOverBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    resetAll();
  });

  // Wire summary bar click to re-expand picker (whole bar, not just text)
  document.getElementById('printerSummary').addEventListener('click', (e) => {
    // Don't re-expand if user clicked the × clear button
    if (e.target.closest('.printer-clear-btn')) return;
    e.stopPropagation();
    expandPrinterPicker();
  });

  // Wire search
  const searchInput = document.getElementById('printerSearchInput');
  searchInput.addEventListener('input', () => handlePrinterSearch(searchInput.value));

  // Close search on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.printer-search-wrap') && !e.target.closest('.printer-search-results')) {
      document.getElementById('printerSearchResults').classList.remove('open');
    }
  });

  renderBrandChips();

  // Restore state: if printer was already selected, expand that brand
  if (state.printer) {
    const p = Engine.getPrinter(state.printer);
    if (p) {
      pickerBrand = p.manufacturer;
      const brand = Engine.getBrands().find(b => b.id === pickerBrand);
      if (brand && !brand.primary) pickerShowMore = true;
      renderBrandChips();
      openModelPanel(pickerBrand);
    }
  }
}

function renderBrandChips() {
  const el = document.getElementById('chips_printer');
  if (!el) return;
  el.innerHTML = '';

  const brands = Engine.getBrands();
  const visible = pickerShowMore ? brands : brands.filter(b => b.primary);

  visible.forEach((b, i) => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (pickerBrand === b.id ? ' selected' : '');
    chip.innerHTML = `<span>${b.name}</span><span class="chip-desc">${b.count} models</span>`;
    chip.style.animationDelay = `${i * 0.03}s`;
    chip.style.animation = 'chipPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both';
    chip.addEventListener('click', () => selectBrand(b.id));
    el.appendChild(chip);
  });

  if (!pickerShowMore) {
    const more = document.createElement('button');
    more.className = 'chip more-chip';
    more.innerHTML = 'More \u25BE';
    more.addEventListener('click', () => {
      pickerShowMore = true;
      renderBrandChips();
    });
    el.appendChild(more);
  }

  el.classList.toggle('has-selection', !!pickerBrand);
}

function selectBrand(brandId) {
  if (pickerBrand === brandId) {
    pickerBrand = null;
    renderBrandChips();
    closeModelPanel();
    return;
  }
  pickerBrand = brandId;
  renderBrandChips();
  openModelPanel(brandId);
}

function openModelPanel(brandId) {
  const panel = document.getElementById('printerModelPanel');
  const inner = document.getElementById('printerModelPanelInner');
  inner.innerHTML = '';

  const groups = Engine.getPrintersByBrand(brandId);
  groups.forEach((s, si) => {
    const group = document.createElement('div');
    group.className = 'series-group';
    group.style.animationDelay = `${si * 0.06}s`;

    const label = document.createElement('div');
    label.className = 'series-label';
    label.textContent = s.label;
    group.appendChild(label);

    const chips = document.createElement('div');
    chips.className = 'chips';
    chips.style.gap = '8px';

    s.models.forEach((m, mi) => {
      const chip = document.createElement('button');
      chip.className = 'model-chip' + (state.printer === m.id ? ' selected' : '');
      chip.innerHTML = `<span>${m.name}</span><span class="chip-desc">${m.desc}</span>`;
      chip.style.animationDelay = `${si * 0.06 + mi * 0.04}s`;
      chip.addEventListener('click', () => selectModel(m.id));
      chips.appendChild(chip);
    });

    group.appendChild(chips);
    inner.appendChild(group);
  });

  requestAnimationFrame(() => panel.classList.add('open'));
}

function closeModelPanel() {
  document.getElementById('printerModelPanel')?.classList.remove('open');
}

function selectModel(printerId) {
  const wasSelected = state.printer === printerId;
  state.printer = wasSelected ? null : printerId;

  // Set active slicer based on printer brand
  Engine.setActiveSlicer(state.printer ? Engine.getSlicerForPrinter(state.printer) : 'bambu_studio');

  // Update model chip visual states
  document.querySelectorAll('.model-chip').forEach(c => {
    const name = c.querySelector('span').textContent;
    const p = Engine.getPrinter(printerId);
    const isThis = p && name === p.name && !wasSelected;
    c.classList.toggle('selected', isThis);
    if (isThis) {
      c.classList.add('just-selected');
      setTimeout(() => c.classList.remove('just-selected'), 600);
    }
  });

  if (state.printer) {
    const p = Engine.getPrinter(state.printer);
    track('printer_selected', { printer: state.printer, brand: p?.manufacturer || 'unknown' });
  }
  renderPrinterSummary();
  // Auto-collapse picker immediately after selecting a printer
  if (state.printer) collapsePrinterPicker();
  render();
}

function clearPrinterSelection() {
  state.printer = null;
  pickerBrand = null;
  pickerCollapsed = false;
  Engine.setActiveSlicer('bambu_studio');
  renderBrandChips();
  closeModelPanel();
  renderPrinterSummary();
  applyPickerCollapsed();
  render();
}

function renderPrinterSummary() {
  const el = document.getElementById('printerSummary');
  const txt = document.getElementById('printerSummaryText');
  if (!el) return;

  const startOver = document.getElementById('startOverBtn');

  if (!state.printer) {
    el.classList.remove('visible');
    startOver?.classList.remove('visible');
    return;
  }

  const p = Engine.getPrinter(state.printer);
  if (!p) { el.classList.remove('visible'); startOver?.classList.remove('visible'); return; }

  const brand = Engine.getBrands().find(b => b.id === p.manufacturer);
  txt.innerHTML = `${brand ? brand.name : p.manufacturer} <span class="crumb">\u203A</span> ${p.name}`;
  el.classList.add('visible');
  startOver?.classList.add('visible');
}

function applyPickerCollapsed() {
  const section = document.getElementById('printerPickerSection');
  if (!section) return;
  section.classList.toggle('picker-collapsed', pickerCollapsed);
}

function collapsePrinterPicker() {
  if (state.printer && !pickerCollapsed) {
    pickerCollapsed = true;
    applyPickerCollapsed();
  }
}

function expandPrinterPicker() {
  pickerCollapsed = false;
  applyPickerCollapsed();
}

function handlePrinterSearch(query) {
  const resultsWrap = document.getElementById('printerSearchResults');
  const resultsInner = document.getElementById('printerSearchResultsInner');

  if (!query || query.trim().length < 2) {
    resultsWrap.classList.remove('open');
    return;
  }

  const matches = Engine.searchPrinters(query.trim());
  resultsInner.innerHTML = '';

  if (matches.length === 0) {
    resultsInner.innerHTML = '<div class="printer-no-results">No printers found</div>';
    resultsWrap.classList.add('open');
    return;
  }

  const q = query.trim().toLowerCase();
  matches.forEach((m, i) => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.style.animationDelay = `${i * 0.04}s`;

    const highlighted = m.name.replace(
      new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
      '<mark>$1</mark>'
    );

    item.innerHTML = `
      <span class="sr-brand">${m.brandName}</span>
      <span class="sr-model">${highlighted}</span>
      <span class="sr-meta">${m.desc}</span>`;
    item.addEventListener('click', () => {
      pickerBrand = m.brandId;
      state.printer = m.id;
      Engine.setActiveSlicer(Engine.getSlicerForPrinter(m.id));
      const brand = Engine.getBrands().find(b => b.id === m.brandId);
      if (brand && !brand.primary) pickerShowMore = true;
      renderBrandChips();
      openModelPanel(m.brandId);
      renderPrinterSummary();
      resultsWrap.classList.remove('open');
      document.getElementById('printerSearchInput').value = '';

      // Auto-collapse after search selection
      collapsePrinterPicker();
      render();
    });
    resultsInner.appendChild(item);
  });

  resultsWrap.classList.add('open');
}

// ── Build filter sections from Engine.getFilters(state) ──────────────────────
// Pass state in so state-dependent chip descs (e.g. Draft layer height for the
// current nozzle) always reflect what resolveProfile() will actually emit.
function buildFilters() {
  const filtersContainer = document.getElementById('filtersContainer');
  filtersContainer.innerHTML = '';
  const isMobile = window.innerWidth <= 768;

  Engine.getFilters(state).forEach(filter => {
    // ── Printer filter gets a custom picker UI ──────────────────────────────
    if (filter.key === 'printer') {
      buildPrinterPicker(filtersContainer, filter);
      return;
    }

    // Skip advanced filters when in simple mode
    if (filter.advanced && currentMode !== 'advanced') return;

    const section = document.createElement('div');
    section.className = 'filter-section';
    const T    = Engine.t;
    const hint = filter.multi ? T('hintMulti') : filter.required ? T('hintRequired') : T('hintOptional');
    section.innerHTML = `
      <div class="filter-row">
        <div class="filter-label-col">
          <div>
            <span class="filter-section-label" data-count="">${filter.label}</span>
            <span class="filter-hint">${hint}</span>
          </div>
          <span class="filter-toggle">▼</span>
        </div>
        <div class="chips" id="chips_${filter.key}"></div>
      </div>`;
    filtersContainer.appendChild(section);

    // Collapsible on mobile — optional sections start collapsed
    if (isMobile && !filter.required) section.classList.add('collapsed');

    // Toggle on label-col click (sibling of chips, so no stopPropagation needed)
    section.querySelector('.filter-label-col').addEventListener('click', () => {
      section.classList.toggle('collapsed');
    });

    const chipsEl = section.querySelector('.chips');
    const hasCore   = filter.items.some(i => i.core === true);
    const isExpanded = expandedSections.has(filter.key);

    // Auto-expand if a non-core item is already selected
    if (hasCore && !isExpanded) {
      const val = state[filter.key];
      const selected = Array.isArray(val) ? val : (val ? [val] : []);
      const hasNonCoreSelected = selected.some(v => filter.items.find(i => i.id === v && i.core === false));
      if (hasNonCoreSelected) expandedSections.add(filter.key);
    }
    const showAll = !hasCore || expandedSections.has(filter.key);

    let hiddenCount = 0;
    filter.items.forEach(item => {
      const isHidden = hasCore && !showAll && item.core === false;
      if (isHidden) { hiddenCount++; return; }
      const chip = document.createElement('button');
      chip.className = item.desc ? 'chip has-desc' : 'chip';
      chip.dataset.value = item.id;
      chip.innerHTML = `<span>${item.name}</span>${item.desc ? `<span class="chip-desc">${item.desc}</span>` : ''}`;
      chip.addEventListener('click', () => handleChipClick(chipsEl, chip, filter.key, item.id, filter.multi));
      chipsEl.appendChild(chip);
    });

    // "+N more" button for collapsed core sections
    if (hiddenCount > 0) {
      const more = document.createElement('button');
      more.className = 'chip more-chip';
      more.innerHTML = `<span>+${hiddenCount} more</span>`;
      more.addEventListener('click', (e) => {
        e.stopPropagation();
        expandedSections.add(filter.key);
        buildFilters();
        restoreChipSelections();
      });
      chipsEl.appendChild(more);
    }

    // "Show less" button when expanded from core
    if (hasCore && showAll && expandedSections.has(filter.key)) {
      const less = document.createElement('button');
      less.className = 'chip more-chip';
      less.innerHTML = `<span>Show less</span>`;
      less.addEventListener('click', (e) => {
        e.stopPropagation();
        expandedSections.delete(filter.key);
        buildFilters();
        restoreChipSelections();
      });
      chipsEl.appendChild(less);
    }
  });

  // Re-apply collapsed state after rebuild (e.g. mode switch keeps picker folded)
  applyPickerCollapsed();
}

// ── Restore chip selections from state after rebuilding filters ───────────────
function restoreChipSelections() {
  Engine.getFilters(state).forEach(filter => {
    const val      = state[filter.key];
    const selected = Array.isArray(val) ? val : (val ? [val] : []);
    document.querySelectorAll(`#chips_${filter.key} .chip`).forEach(chip => {
      chip.classList.toggle('selected', selected.includes(chip.dataset.value));
    });
  });
}

// ── Update selected-count badge on collapsed filter labels ───────────────────
function updateCollapseBadges() {
  Engine.getFilters(state).forEach(filter => {
    const labelEl = document.querySelector(`#chips_${filter.key}`)
      ?.closest('.filter-section')
      ?.querySelector('.filter-section-label');
    if (!labelEl) return;
    const val = state[filter.key];
    const count = Array.isArray(val) ? val.length : (val ? 1 : 0);
    labelEl.dataset.count = count > 0 ? String(count) : '';
  });
}

// ── Refresh state-dependent chip descs in place (IMPL-040) ───────────────────
// Chip descs for surface/strength/support now contain numbers computed from
// current state (e.g. Draft layer height clamped for the selected nozzle).
// Rather than rebuild the entire DOM on every nozzle change, we patch just
// the `.chip-desc` text so selection state + focus are preserved.
function updateDynamicChipDescs() {
  Engine.getFilters(state).forEach(filter => {
    if (!['surface', 'strength', 'support'].includes(filter.key)) return;
    const chipsEl = document.getElementById(`chips_${filter.key}`);
    if (!chipsEl) return;
    filter.items.forEach(item => {
      const chip = chipsEl.querySelector(`.chip[data-value="${item.id}"]`);
      if (!chip) return;
      const descEl = chip.querySelector('.chip-desc');
      if (descEl && item.desc) descEl.textContent = item.desc;
    });
  });
}

// ── Top-level view switching (Configure / Troubleshoot) ──────────────────────
function setView(view) {
  currentView = view;
  document.getElementById('viewConfigure').style.display    = view === 'configure'    ? '' : 'none';
  document.getElementById('viewTroubleshoot').style.display  = view === 'troubleshoot'  ? '' : 'none';
  document.getElementById('viewWorkshop').style.display      = view === 'workshop'      ? '' : 'none';
  document.getElementById('viewFeedback').style.display      = view === 'feedback'      ? '' : 'none';
  document.getElementById('navConfigure').classList.toggle('active',    view === 'configure');
  document.getElementById('navTroubleshoot').classList.toggle('active',  view === 'troubleshoot');
  document.getElementById('navWorkshop').classList.toggle('active',      view === 'workshop');
  document.getElementById('navFeedback').classList.toggle('active',      view === 'feedback');
  if (view === 'workshop') renderWorkshop();
}

// ── Workshop (IMPL-044 W1) ────────────────────────────────────────────────────
let _nameModalOnSave = null;

function openNameModal(title, initial, onSave) {
  document.getElementById('nameModalTitle').textContent = title;
  const input = document.getElementById('nameModalInput');
  input.value = initial || '';
  _nameModalOnSave = onSave;
  document.getElementById('nameModal').showModal();
  requestAnimationFrame(() => { input.focus(); input.select(); });
}

// ── Workshop tuning suggestions (IMPL-044 W3 gate B3) ─────────────────────────
// Harvest is pure recomputation (journals × rules × ledger) — see workshop-tuning.js.
// Accepted offsets are stored for the future Mine tier; nothing feeds the engine yet.
let _workshopTuning = null;

function getWorkshopTuning() {
  if (!_workshopTuning && WorkshopStore && typeof createWorkshopTuning !== 'undefined') {
    const engineFacts = {
      materialGroup: id => (Engine.getMaterial(id) || {}).group || null,
      printerExists: id => !!Engine.getPrinter(id),
      materialExists: id => !!Engine.getMaterial(id),
      symptomName: id => {
        const s = Engine.getSymptoms().find(x => x.id === id);
        return s ? s.name : id;
      },
    };
    _workshopTuning = createWorkshopTuning(
      WorkshopStore, { TUNING_RULES, rulesForSymptom }, engineFacts);
  }
  return _workshopTuning;
}

// Offset keys map to slicer-setting families — English on purpose, same rule
// as PARAM_LABELS (users must find the setting in their slicer's UI).
const TUNING_OFFSET_LABELS = {
  nozzle_temp_delta: 'Nozzle temperature',
  bed_temp_delta: 'Bed temperature',
  fan_delta_pct: 'Cooling fan',
  retraction_distance_delta: 'Retraction distance',
  speed_multiplier_delta: 'Print speed',
};

const TUNING_ADVICE_KEYS = {
  dry_filament: 'wsSuggestAdviceDry',
  first_layer_basics: 'wsSuggestAdviceFirstLayer',
};

function _fmtStep(step, unit) {
  const sign = step > 0 ? '+' : '';
  return unit === '%' ? `${sign}${step}%` : `${sign}${step} ${unit}`;
}

function renderSuggestions() {
  const el = document.getElementById('workshopSuggestions');
  const wt = getWorkshopTuning();
  if (!el || !wt) return;
  const T = Engine.t;
  const suggestions = wt.harvest();
  const accepted = WorkshopStore.getTuning().accepted.filter(e => e.value !== 0);

  if (!suggestions.length && !accepted.length) { el.innerHTML = ''; return; }

  const symptomName = {};
  Engine.getSymptoms().forEach(s => { symptomName[s.id] = s.name; });

  let html = '';
  if (suggestions.length) {
    html += `<div class="ws-suggest-title">${T('wsSuggestTitle')}</div>`;
    html += suggestions.map((s, i) => {
      // Mandatory on every card (spec §3.2): the mechanical-causes-first deep-link.
      const mech = s.symptomId
        ? `<button class="ws-suggest-trouble" data-symptom="${escHtml(s.symptomId)}">${T('wsSuggestMechanical')} →</button>`
        : '';
      if (s.kind === 'conflict') {
        const names = s.conflictingSymptoms.map(id => escHtml(symptomName[id] || id)).join(', ');
        const text = T('wsSuggestConflict')
          .replace('{param}', TUNING_OFFSET_LABELS[s.offsetKey] || s.offsetKey)
          .replace('{symptoms}', names);
        return `<div class="ws-suggest-card conflict">
          <div class="ws-suggest-body">${text}</div>
          <button class="ws-suggest-trouble" data-symptom="${escHtml(s.conflictingSymptoms[0])}">${T('wsSuggestMechanical')} →</button>
          <div class="ws-suggest-actions"><button class="export-btn ws-suggest-dismiss" data-i="${i}">${T('wsSuggestDismiss')}</button></div>
        </div>`;
      }
      if (s.kind === 'advice') {
        return `<div class="ws-suggest-card advice">
          <div class="ws-suggest-body">${T(TUNING_ADVICE_KEYS[s.adviceKey] || 'wsSuggestAdviceFirstLayer')}</div>
          ${mech}
          <div class="ws-suggest-actions"><button class="export-btn ws-suggest-dismiss" data-i="${i}">${T('wsSuggestDismiss')}</button></div>
        </div>`;
      }
      const evidence = T('wsSuggestEvidence')
        .replace('{failed}', String(s.evidence.failed))
        .replace('{symptom}', symptomName[s.symptomId] || s.symptomId)
        .replace('{date}', (s.evidence.lastDate || '').slice(0, 10));
      const secondary = s.secondaryHints.length
        ? `<div class="ws-suggest-secondary">${T('wsSuggestSecondary').replace('{hint}', escHtml(s.secondaryHints[0]))}</div>`
        : '';
      const printer = Engine.getPrinter(s.printerId);
      const mat = Engine.getMaterial(s.materialId);
      return `<div class="ws-suggest-card">
        <div class="ws-suggest-head">
          <span class="ws-suggest-offset">${TUNING_OFFSET_LABELS[s.offsetKey] || s.offsetKey} ${_fmtStep(s.step, s.unit)}</span>
          <span class="ws-suggest-pair">${escHtml((printer ? printer.name : s.printerId) + ' · ' + (mat ? mat.name : s.materialId))}</span>
        </div>
        <div class="ws-suggest-evidence">${escHtml(evidence)}</div>
        ${mech}
        ${secondary}
        <div class="ws-suggest-actions">
          <button class="export-btn ws-suggest-accept" data-i="${i}">${T('wsSuggestAccept')}</button>
          <button class="export-btn ws-suggest-dismiss" data-i="${i}">${T('wsSuggestDismiss')}</button>
        </div>
      </div>`;
    }).join('');
  }

  if (accepted.length) {
    html += `<div class="ws-suggest-title">${T('wsMyTuning')}</div>`;
    html += accepted.map(e => {
      const [pid, mid] = e.pairKey.split('|');
      const printer = Engine.getPrinter(pid);
      const mat = Engine.getMaterial(mid);
      const orphan = !printer || !mat;
      const pairLabel = (printer ? printer.name : pid) + ' · ' + (mat ? mat.name : mid);
      return `<div class="ws-tuning-row${orphan ? ' orphan' : ''}">
        <span>${TUNING_OFFSET_LABELS[e.offsetKey] || e.offsetKey} ${_fmtStep(e.value, e.unit)} — ${escHtml(pairLabel)}${orphan ? ' ' + T('wsTuningOrphan') : ''}</span>
        <button class="export-btn ws-tuning-remove" data-pair="${escHtml(e.pairKey)}" data-key="${escHtml(e.offsetKey)}">${T('wsTuningRemove')}</button>
      </div>`;
    }).join('');
  }

  el.innerHTML = html;

  el.querySelectorAll('.ws-suggest-accept').forEach(b =>
    b.addEventListener('click', () => {
      const s = suggestions[Number(b.dataset.i)];
      if (s && wt.accept(s).ok) { showToast(T('wsSuggestAccepted')); renderWorkshop(); }
    }));
  el.querySelectorAll('.ws-suggest-dismiss').forEach(b =>
    b.addEventListener('click', () => {
      const s = suggestions[Number(b.dataset.i)];
      if (s && wt.dismiss(s).ok) renderWorkshop();
    }));
  el.querySelectorAll('.ws-tuning-remove').forEach(b =>
    b.addEventListener('click', () => {
      if (wt.revert(b.dataset.pair, b.dataset.key).ok) renderWorkshop();
    }));
  el.querySelectorAll('.ws-suggest-trouble').forEach(b =>
    b.addEventListener('click', () => {
      setView('troubleshoot');
      activeSymptom = b.dataset.symptom;
      document.querySelectorAll('.symptom-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.id === activeSymptom);
      });
      renderTroubleshooter();
    }));
}

function renderWorkshop() {
  const el = document.getElementById('workshopList');
  if (!el || !WorkshopStore) return;
  const T = Engine.t;
  renderSuggestions();
  const profiles = WorkshopStore.list();

  if (!profiles.length) {
    el.innerHTML = `
      <div class="workshop-empty">
        <div class="workshop-empty-title">${T('workshopEmpty')}</div>
        <div>${T('workshopEmptySub')}</div>
      </div>`;
    return;
  }

  // Profile names are user input — escHtml everything interpolated here.
  el.innerHTML = `<div class="workshop-grid">` + profiles.map(p => {
    const printer = p.state.printer ? Engine.getPrinter(p.state.printer) : null;
    const mat     = p.state.material ? Engine.getMaterial(p.state.material) : null;
    const nz      = p.state.nozzle ? Engine.getNozzle(p.state.nozzle) : null;
    const meta    = [printer?.name, mat?.name, nz?.name].filter(Boolean).join(' · ') || '—';
    const date    = (p.updated || p.created || '').slice(0, 10);
    return `
      <div class="ws-card">
        <div class="ws-card-head">
          <span class="ws-name">${escHtml(p.name)}</span>
          <span class="ws-date">${escHtml(date)}</span>
        </div>
        <div class="ws-meta">${escHtml(meta)}</div>
        <div class="ws-actions">
          <button class="export-btn ws-load" data-id="${escHtml(p.id)}">${T('wsLoad')}</button>
          <button class="export-btn ws-share" data-id="${escHtml(p.id)}">${T('shareBtn')}</button>
          <button class="export-btn ws-rename" data-id="${escHtml(p.id)}">${T('wsRename')}</button>
          <button class="export-btn ws-delete" data-id="${escHtml(p.id)}">${T('wsDelete')}</button>
        </div>
        ${renderJournal(p)}
        <button class="ws-log-btn" data-id="${escHtml(p.id)}">${T('wsLogOutcome')}</button>
      </div>`;
  }).join('') + `</div>`;

  el.querySelectorAll('.ws-load').forEach(b =>
    b.addEventListener('click', () => restoreWorkshopProfile(b.dataset.id)));

  el.querySelectorAll('.ws-log-btn').forEach(b =>
    b.addEventListener('click', () => openOutcomeModal(b.dataset.id)));

  el.querySelectorAll('.ws-outcome-trouble').forEach(b =>
    b.addEventListener('click', () => {
      // Deep-link a failed outcome into the troubleshooter with the symptom
      // preselected (IMPL-044 W2).
      setView('troubleshoot');
      activeSymptom = b.dataset.symptom;
      document.querySelectorAll('.symptom-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.id === activeSymptom);
      });
      renderTroubleshooter();
    }));

  el.querySelectorAll('.ws-outcome-remove').forEach(b =>
    b.addEventListener('click', () => {
      WorkshopStore.removeOutcome(b.dataset.pid, b.dataset.oid);
      renderWorkshop();
    }));

  el.querySelectorAll('.ws-share').forEach(b =>
    b.addEventListener('click', () => {
      const p = WorkshopStore.get(b.dataset.id);
      if (p) copyShareUrl(StateCodec.validateState(p.state, Engine));
    }));

  el.querySelectorAll('.ws-rename').forEach(b =>
    b.addEventListener('click', () => {
      const p = WorkshopStore.get(b.dataset.id);
      if (!p) return;
      openNameModal(Engine.t('wsRenameTitle'), p.name, name => {
        WorkshopStore.rename(p.id, name);
        renderWorkshop();
      });
    }));

  // Delete uses a two-tap confirm: first tap arms the button for 3 seconds.
  el.querySelectorAll('.ws-delete').forEach(b =>
    b.addEventListener('click', () => {
      if (b.dataset.armed === '1') {
        WorkshopStore.remove(b.dataset.id);
        renderWorkshop();
        return;
      }
      b.dataset.armed = '1';
      b.classList.add('ws-delete-armed');
      const orig = b.textContent;
      b.textContent = Engine.t('wsDeleteConfirm');
      setTimeout(() => {
        b.dataset.armed = '';
        b.classList.remove('ws-delete-armed');
        b.textContent = orig;
      }, 3000);
    }));
}

// Journal rows for one profile card (IMPL-044 W2). Newest first, capped at 4
// visible so cards stay compact; symptom ids resolve to localized names.
function renderJournal(p) {
  const T = Engine.t;
  const journal = Array.isArray(p.journal) ? p.journal : [];
  if (!journal.length) return '';
  const symptomName = {};
  Engine.getSymptoms().forEach(s => { symptomName[s.id] = s.name; });
  const rows = [...journal].reverse().slice(0, 4).map(o => {
    const date = (o.date || '').slice(0, 10);
    const tags = (o.symptoms || []).map(id =>
      `<span class="ws-tag">${escHtml(symptomName[id] || id)}</span>`).join('');
    const trouble = (o.result === 'failed' && o.symptoms && o.symptoms.length)
      ? `<button class="ws-outcome-trouble" data-symptom="${escHtml(o.symptoms[0])}">${T('wsTroubleshootLink')}</button>`
      : '';
    return `
      <div class="ws-outcome ${o.result === 'failed' ? 'failed' : 'worked'}">
        <span class="ws-outcome-icon">${o.result === 'failed' ? '✗' : '✓'}</span>
        <div class="ws-outcome-body">
          <span class="ws-outcome-date">${escHtml(date)}</span>
          ${tags}
          ${o.note ? `<span class="ws-outcome-note">${escHtml(o.note)}</span>` : ''}
          ${trouble}
        </div>
        <button class="ws-outcome-remove" title="Remove entry" data-pid="${escHtml(p.id)}" data-oid="${escHtml(o.id)}">&times;</button>
      </div>`;
  }).join('');
  return `<div class="ws-journal">${rows}</div>`;
}

// Outcome-logging dialog state + open/save (IMPL-044 W2)
let _outcomeProfileId = null;
let _outcomeResult = 'worked';
const _outcomeSymptoms = new Set();

function openOutcomeModal(profileId) {
  const T = Engine.t;
  _outcomeProfileId = profileId;
  _outcomeResult = 'worked';
  _outcomeSymptoms.clear();
  document.getElementById('outcomeModalTitle').textContent = T('outcomeTitle');
  document.getElementById('outcomeNote').value = '';
  document.getElementById('outcomeNote').placeholder = T('outcomeNotePlaceholder');
  const chipsEl = document.getElementById('outcomeSymptomChips');
  chipsEl.innerHTML = '';
  Engine.getSymptoms().forEach(s => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.dataset.value = s.id;
    chip.innerHTML = `<span>${s.icon} ${s.name}</span>`;
    chip.addEventListener('click', () => {
      const on = !_outcomeSymptoms.has(s.id);
      chip.classList.toggle('selected', on);
      if (on) _outcomeSymptoms.add(s.id); else _outcomeSymptoms.delete(s.id);
    });
    chipsEl.appendChild(chip);
  });
  _syncOutcomeToggle();
  document.getElementById('outcomeModal').showModal();
}

function _syncOutcomeToggle() {
  document.getElementById('outcomeWorkedBtn').classList.toggle('active', _outcomeResult === 'worked');
  document.getElementById('outcomeFailedBtn').classList.toggle('active', _outcomeResult === 'failed');
  document.getElementById('outcomeSymptoms').style.display = _outcomeResult === 'failed' ? '' : 'none';
}

function restoreWorkshopProfile(id) {
  const p = WorkshopStore.get(id);
  if (!p) return;
  applyRestoredState(StateCodec.validateState(p.state, Engine));
  buildFilters();
  restoreChipSelections();
  renderPrinterSummary();
  setView('configure');
  render();
  showToast(Engine.t('wsLoaded'));
}

// ── Build troubleshooter symptom grid ─────────────────────────────────────────
function buildTroubleshooter() {
  const grid = document.getElementById('symptomGrid');
  Engine.getSymptoms().forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'symptom-chip';
    btn.dataset.id = s.id;
    btn.innerHTML = `
      <span class="symptom-icon">${s.icon}</span>
      <span class="symptom-name">${s.name}</span>
      <span class="symptom-desc">${s.desc}</span>`;
    btn.addEventListener('click', () => selectSymptom(s.id));
    grid.appendChild(btn);
  });
}

function selectSymptom(id) {
  activeSymptom = activeSymptom === id ? null : id;
  if (activeSymptom) track('troubleshoot_used', { symptom: id });
  document.querySelectorAll('.symptom-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.id === activeSymptom);
  });
  renderTroubleshooter();
}

function renderTroubleshooter() {
  const el = document.getElementById('troubleResults');
  if (!activeSymptom) { el.innerHTML = ''; return; }

  const T        = Engine.t;
  const matGroup = state.material ? (Engine.getMaterial(state.material)?.group || null) : null;
  const causes   = Engine.getTroubleshootingTips(activeSymptom, matGroup);

  const relevantNote = matGroup
    ? `<span style="color:var(--green);font-family:'DM Mono',monospace;font-size:11px">● ${T('troubleMatActive')} ${Engine.getMaterial(state.material).name}</span>`
    : `<span style="color:var(--text2);font-family:'DM Mono',monospace;font-size:11px">${T('troubleMatNote')}</span>`;

  el.innerHTML = `
    <div class="trouble-results-header">
      ${T('troubleHeader')} &nbsp;·&nbsp; ${relevantNote}
    </div>
    <div class="cause-list">
      ${causes.map((c, i) => `
        <div class="cause-card ${c.relevant ? 'relevant' : 'dimmed'}">
          <div class="cause-rank">${i + 1}</div>
          <div class="cause-body">
            <div class="cause-title">${c.title}</div>
            <div class="cause-detail">${c.detail}</div>
            <div class="cause-fix-row">
              <span class="cause-setting-label">⚙ ${c.setting}</span>
              <span class="cause-fix">${c.fix}</span>
            </div>
          </div>
        </div>`).join('')}
    </div>`;
}

// ── HTML escape helper — prevents XSS when injecting user input into innerHTML ─
const escHtml = s => String(s)
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');


// ── Bind mode toggle + reset ──────────────────────────────────────────────────
function bindControls() {
  const modal = document.getElementById('infoModal');
  document.getElementById('modalClose').addEventListener('click', () => modal.close());
  modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });

  document.getElementById('modeSimple').addEventListener('click',   () => setMode('simple'));
  document.getElementById('modeAdvanced').addEventListener('click', () => setMode('advanced'));
  document.getElementById('langEN').addEventListener('click', () => { Engine.setLang('en'); applyLang(); });
  document.getElementById('langDA').addEventListener('click', () => { Engine.setLang('da'); applyLang(); });
  document.getElementById('themeBtn').addEventListener('click', () => {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });
  document.getElementById('navConfigure').addEventListener('click',    () => setView('configure'));
  document.getElementById('navTroubleshoot').addEventListener('click',  () => setView('troubleshoot'));
  document.getElementById('navWorkshop').addEventListener('click',      () => setView('workshop'));
  document.getElementById('navFeedback').addEventListener('click',      () => setView('feedback'));

  // ── Workshop wiring (IMPL-044 W1) ──────────────────────────────────────────
  const nameModal = document.getElementById('nameModal');
  const nameInput = document.getElementById('nameModalInput');
  const nameCommit = () => {
    const name = nameInput.value.trim();
    if (!name || !_nameModalOnSave) return;
    const cb = _nameModalOnSave;
    _nameModalOnSave = null;
    nameModal.close();
    cb(name);
  };
  document.getElementById('nameModalClose').addEventListener('click', () => { _nameModalOnSave = null; nameModal.close(); });
  nameModal.addEventListener('click', e => { if (e.target === nameModal) { _nameModalOnSave = null; nameModal.close(); } });
  document.getElementById('nameModalSave').addEventListener('click', nameCommit);
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nameCommit(); } });

  document.getElementById('saveProfileBtn').addEventListener('click', () => {
    if (!state.printer || !state.nozzle || !state.material || !WorkshopStore) return;
    const p = Engine.getPrinter(state.printer);
    const m = Engine.getMaterial(state.material);
    const suggested = [m?.name, p?.name].filter(Boolean).join(' · ');
    openNameModal(Engine.t('saveProfileTitle'), suggested, name => {
      // Snapshot through the codec so only known state fields are stored.
      const snapshot = JSON.parse(StateCodec.encodeForStorage(state)).state;
      const r = WorkshopStore.save(name, snapshot);
      showToast(r.ok ? Engine.t('profileSaved') : Engine.t('wsSaveFailed'));
    });
  });

  // Outcome-logging dialog (IMPL-044 W2)
  const outcomeModal = document.getElementById('outcomeModal');
  document.getElementById('outcomeModalClose').addEventListener('click', () => outcomeModal.close());
  outcomeModal.addEventListener('click', e => { if (e.target === outcomeModal) outcomeModal.close(); });
  document.getElementById('outcomeWorkedBtn').addEventListener('click', () => { _outcomeResult = 'worked'; _syncOutcomeToggle(); });
  document.getElementById('outcomeFailedBtn').addEventListener('click', () => { _outcomeResult = 'failed'; _syncOutcomeToggle(); });
  document.getElementById('outcomeModalSave').addEventListener('click', () => {
    if (!_outcomeProfileId || !WorkshopStore) return;
    const r = WorkshopStore.addOutcome(_outcomeProfileId, {
      result: _outcomeResult,
      symptoms: _outcomeResult === 'failed' ? [..._outcomeSymptoms] : [],
      note: document.getElementById('outcomeNote').value.trim(),
    });
    outcomeModal.close();
    showToast(r.ok ? Engine.t('outcomeSaved') : Engine.t('wsSaveFailed'));
    renderWorkshop();
  });

  document.getElementById('wsExportBtn').addEventListener('click', () => {
    if (!WorkshopStore) return;
    _downloadJSONText(WorkshopStore.exportJSON(), '3dpa-workshop-backup.json');
  });
  document.getElementById('wsImportBtn').addEventListener('click', () =>
    document.getElementById('wsImportFile').click());
  document.getElementById('wsImportFile').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file || !WorkshopStore) return;
    const reader = new FileReader();
    reader.onload = () => {
      const r = WorkshopStore.importJSON(String(reader.result));
      showToast(r.ok ? Engine.t('wsImported') : Engine.t('wsImportFailed'));
      renderWorkshop();
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Feedback modal — any .feedback-card[data-feedback-category] opens it
  document.querySelectorAll('.feedback-card[data-feedback-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.feedbackCategory;
      track('feedback_opened', { feedbackCategory: category || '' });
      if (window.FeedbackForm && typeof window.FeedbackForm.open === 'function') {
        window.FeedbackForm.open(category);
      }
    });
  });

  // Process export button
  document.getElementById('exportProcessBtn').addEventListener('click', () => {
    if (!state.printer || !state.nozzle || !state.material) return;
    const T = Engine.t;
    const btn = document.getElementById('exportProcessBtn');
    track('export_clicked', { type: 'process', printer: state.printer, nozzle: state.nozzle, material: state.material });
    const result = Engine.exportBambuStudioJSON(state);
    if (result?.process) {
      _downloadJSON(result.process, `3DPA_process_${state.material}.json`);
      _flashBtn(btn, '↓ Done');
    }
  });

  // Filament export button
  document.getElementById('exportFilamentBtn').addEventListener('click', () => {
    if (!state.printer || !state.nozzle || !state.material) return;
    const T = Engine.t;
    const btn = document.getElementById('exportFilamentBtn');
    track('export_clicked', { type: 'filament', printer: state.printer, nozzle: state.nozzle, material: state.material });
    const result = Engine.exportBambuStudioJSON(state);
    if (result?.filament) {
      _downloadJSON(result.filament, `3DPA_filament_${state.material}.json`);
      _flashBtn(btn, '↓ Done');
    }
  });

  // Copy fallback for non-Bambu printers
  document.getElementById('exportCopyBtn').addEventListener('click', () => {
    if (!state.printer || !state.nozzle || !state.material) return;
    const T = Engine.t;
    const btn = document.getElementById('exportCopyBtn');
    track('export_clicked', { type: 'copy', printer: state.printer, nozzle: state.nozzle, material: state.material });
    const text = Engine.formatProfileAsText(state);
    if (text) {
      navigator.clipboard.writeText(text).then(() => _flashBtn(btn, T('exportCopied')));
    }
  });

  function _downloadJSON(obj, filename) {
    _downloadJSONText(JSON.stringify(obj, null, 2), filename);
  }

  function _downloadJSONText(text, filename) {
    const blob = new Blob([text], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function _flashBtn(btn, msg) {
    const orig = btn.textContent;
    btn.textContent = msg;
    btn.style.color = 'var(--green)';
    setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 2500);
  }

  // Share — copy a URL that reproduces the current profile (IMPL-042 Phase B)
  document.getElementById('shareBtn').addEventListener('click', () => {
    if (!state.printer || !state.nozzle || !state.material) return;
    copyShareUrl(state);
  });

  document.getElementById('compareLockBtn').addEventListener('click', () => {
    if (comparisonProfile) {
      comparisonProfile = null;
    } else {
      if (!state.printer || !state.nozzle || !state.material) return;
      const printer = Engine.getPrinter(state.printer)?.name   || state.printer;
      const mat     = Engine.getMaterial(state.material)?.name || state.material;
      const nozzle  = Engine.getNozzle(state.nozzle)?.name     || state.nozzle;
      comparisonProfile = {
        profile: Engine.resolveProfile(state),
        label:   `${mat} · ${printer} · ${nozzle}`,
      };
    }
    render();
  });

  document.getElementById('resetBtn').addEventListener('click', resetAll);
}

// ── Full reset — shared by the header Reset button and "Start over" ──────────
function resetAll() {
  Object.keys(state).forEach(k => { state[k] = Array.isArray(state[k]) ? [] : null; });
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
  expandedSections.clear();
  comparisonProfile = null;
  // Reset printer picker state
  pickerBrand = null;
  pickerShowMore = false;
  pickerCollapsed = false;
  Engine.setActiveSlicer('bambu_studio');
  renderBrandChips();
  closeModelPanel();
  renderPrinterSummary();
  applyPickerCollapsed();
  const searchInput = document.getElementById('printerSearchInput');
  if (searchInput) searchInput.value = '';
  document.getElementById('printerSearchResults')?.classList.remove('open');
  updateCollapseBadges();
  render();
}

// ── Mode toggle ───────────────────────────────────────────────────────────────
function setMode(mode) {
  currentMode = mode;
  document.getElementById('modeSimple').classList.toggle('active',   mode === 'simple');
  document.getElementById('modeAdvanced').classList.toggle('active', mode === 'advanced');
  buildFilters();
  restoreChipSelections();
  render();
}

// ── Click-to-copy on setting rows ───────────────────────────────────────────
document.addEventListener('click', (e) => {
  const row = e.target.closest('.setting-row');
  if (!row) return;
  const name  = row.querySelector('.setting-name')?.textContent || '';
  const value = row.querySelector('.setting-value')?.textContent || '';
  if (!name || !value) return;
  navigator.clipboard.writeText(`${name}: ${value}`).then(() => {
    row.classList.add('copied-flash');
    setTimeout(() => row.classList.remove('copied-flash'), 600);
  });
});

// ── Nozzle chip filtering based on material compatibility ────────────────────
function updateNozzleChips() {
  const container = document.getElementById('chips_nozzle');
  if (!container) return;
  const nozzles = Engine.getCompatibleNozzles(state.material);
  container.querySelectorAll('.chip:not(.more-chip)').forEach(chip => {
    const nz = nozzles.find(n => n.id === chip.dataset.value);
    const incompatible = nz && !nz.compatible;
    chip.classList.toggle('incompatible', incompatible);
    if (incompatible && chip.classList.contains('selected')) {
      // Deselect incompatible nozzle
      chip.classList.remove('selected');
      state.nozzle = null;
    }
  });
}

// ── Chip interaction ──────────────────────────────────────────────────────────
function handleChipClick(container, clicked, key, value, isMulti) {
  let justSelected = false;
  if (isMulti) {
    const was = clicked.classList.contains('selected');
    clicked.classList.toggle('selected', !was);
    state[key] = was ? state[key].filter(v => v !== value) : [...state[key], value];
    justSelected = !was;
  } else {
    const was = clicked.classList.contains('selected');
    container.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    clicked.classList.toggle('selected', !was);
    state[key] = was ? null : value;
    justSelected = !was;
  }
  if (justSelected) {
    if (key === 'nozzle') {
      track('nozzle_selected', { nozzle: value, material: state.material || null });
    } else if (key === 'material') {
      const mat = Engine.getMaterial(value);
      track('material_selected', { material: value, group: mat?.group || 'unknown' });
    } else if (key === 'useCase') {
      track('use_case_selected', { use_case: value });
    }
  }
  // Auto-collapse printer picker when interacting with any other filter
  if (key !== 'printer') collapsePrinterPicker();
  render();
}

// ── Main render ───────────────────────────────────────────────────────────────
function render() {
  persistState();
  syncUrl();
  updateCollapseBadges();
  updateDynamicChipDescs();
  renderPrinterSummary();
  updateNozzleChips();
  // Update panel sub-titles based on active slicer
  const T = Engine.t;
  const slicerSub = (key) => { const sk = key + '_' + Engine.getActiveSlicer(); const v = T(sk); return v !== sk ? v : T(key); };
  document.getElementById('panelProfSub').textContent = slicerSub('panelProfSub');
  document.getElementById('panelFilSub').textContent  = slicerSub('panelFilSub');
  // Show correct export UI based on slicer
  const exportGroup  = document.getElementById('exportGroup');
  const exportCopyBtn = document.getElementById('exportCopyBtn');
  const hasMin = state.printer && state.nozzle && state.material;
  if (hasMin && state.printer) {
    const slicer = Engine.getSlicerForPrinter(state.printer);
    if (slicer === 'bambu_studio') {
      exportGroup.style.display  = 'flex';
      exportCopyBtn.style.display = 'none';
      // Grey out filament button if no filament export available
      const result = Engine.exportBambuStudioJSON(state);
      const filamentBtn = document.getElementById('exportFilamentBtn');
      filamentBtn.disabled = !result?.filament;
      filamentBtn.title = result?.filament
        ? 'Download filament profile (temperatures, cooling, PA) for Bambu Studio'
        : 'Filament export not available for this material/printer combination';
    } else {
      exportGroup.style.display  = 'none';
      exportCopyBtn.style.display = 'block';
    }
  } else {
    exportGroup.style.display  = 'none';
    exportCopyBtn.style.display = 'none';
  }
  if (hasMin) {
    const profileKey = JSON.stringify({
      printer: state.printer,
      nozzle: state.nozzle,
      material: state.material,
      useCase: [...(state.useCase || [])].sort(),
      surface: state.surface,
      strength: state.strength,
      speed: state.speed,
      environment: state.environment,
      support: state.support,
      colors: state.colors,
      userLevel: state.userLevel,
      special: [...(state.special || [])].sort(),
      seam: state.seam,
      brim: state.brim,
      build_plate: state.build_plate,
      extruder_type: state.extruder_type,
      filament_condition: state.filament_condition,
      ironing: state.ironing,
      profileMode: state.profileMode || 'safe',
      outputMode: currentMode,
    });
    if (profileKey !== _lastTrackedProfileKey) {
      _lastTrackedProfileKey = profileKey;
      track('profile_generated', analyticsSelectionProps());
    }
  }
  document.getElementById('emptyState').style.display    = hasMin ? 'none' : '';
  document.getElementById('resultsLayout').style.display = hasMin ? ''     : 'none';

  // Show compare button only when a profile is available; update its state
  const lockBtn = document.getElementById('compareLockBtn');
  if (lockBtn) {
    lockBtn.classList.toggle('visible', !!hasMin);
    lockBtn.classList.toggle('locked',  !!comparisonProfile);
    lockBtn.textContent = comparisonProfile ? Engine.t('compareClear') : Engine.t('compareBtn');
  }
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) shareBtn.classList.toggle('visible', !!hasMin);
  const saveBtn = document.getElementById('saveProfileBtn');
  if (saveBtn) saveBtn.classList.toggle('visible', !!hasMin);

  if (!hasMin) {
    // Clear comparison banner if no selection
    document.getElementById('compareBanner').innerHTML = '';
    return;
  }

  const nozzle   = Engine.getNozzle(state.nozzle);
  const filament = Engine.getFilamentProfile(state.material);
  const profile  = Engine.resolveProfile(state);
  const warnings = Engine.getWarnings(state);

  renderWarnings(warnings);
  renderChecklist(Engine.getChecklist(state));
  renderPrintTimeEstimator(profile);
  renderFilamentPanel(filament, nozzle);
  renderProfilePanel(profile);
}

// ── Print Time Estimator ──────────────────────────────────────────────────────
function renderPrintTimeEstimator(profile) {
  const el = document.getElementById('printTimePanel');
  const T  = Engine.t;

  const result = Engine.calcPrintTime({
    height_mm: ptState.height, width_mm: ptState.width,
    depth_mm:  ptState.depth,  walls:    ptState.walls,
    infill_pct: ptState.infill,
  }, state);

  const fmt = secs => {
    if (secs < 60)   return '< 1 min';
    const h = Math.floor(secs / 3600);
    const m = Math.round((secs % 3600) / 60);
    return h === 0 ? `${m} min` : `${h}h ${String(m).padStart(2, '0')}min`;
  };

  el.innerHTML = `
    <div class="pt-panel">
      <div class="pt-header">
        <div class="pt-title-group">
          <span class="pt-title">${T('ptTitle')}</span>
          <span class="pt-sub">${T('ptSub')}</span>
        </div>
      </div>
      <div class="pt-inputs">
        <label class="pt-field">
          <span class="pt-label">${T('ptHeight')} (mm)</span>
          <input class="pt-input" type="number" min="1" max="256" value="${ptState.height}"
            oninput="updatePTState('height', this.value)"/>
        </label>
        <label class="pt-field">
          <span class="pt-label">${T('ptWidth')} (mm)</span>
          <input class="pt-input" type="number" min="1" max="256" value="${ptState.width}"
            oninput="updatePTState('width', this.value)"/>
        </label>
        <label class="pt-field">
          <span class="pt-label">${T('ptDepth')} (mm)</span>
          <input class="pt-input" type="number" min="1" max="256" value="${ptState.depth}"
            oninput="updatePTState('depth', this.value)"/>
        </label>
        <label class="pt-field">
          <span class="pt-label">${T('ptWalls')}</span>
          <select class="pt-input" onchange="updatePTState('walls', this.value)">
            ${[2,3,4,5].map(n => `<option value="${n}"${ptState.walls == n ? ' selected' : ''}>${n}</option>`).join('')}
          </select>
        </label>
        <label class="pt-field">
          <span class="pt-label">${T('ptInfill')} (%)</span>
          <select class="pt-input" onchange="updatePTState('infill', this.value)">
            ${[10,15,20,35,50].map(n => `<option value="${n}"${ptState.infill == n ? ' selected' : ''}>${n}%</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="pt-result">
        <div class="pt-result-label">${T('ptResult')}</div>
        <div class="pt-time-range">
          <span class="pt-time-low">${fmt(result.low)}</span>
          <span class="pt-time-sep">–</span>
          <span class="pt-time-high">${fmt(result.high)}</span>
        </div>
        <div class="pt-meta">
          ${result.numLayers} ${T('ptLayers')} · ${T('ptAt')} ${result.outerSpeed} mm/s ${T('ptOuterSpeed')} · ${result.layerHeight} mm
        </div>
        <div class="pt-disclaimer">${T('ptDisclaimer')}</div>
      </div>
    </div>`;
}

function updatePTState(key, val) {
  ptState[key] = Number(val);
  const profile = Engine.resolveProfile(state);
  renderPrintTimeEstimator(profile);
}

// ── Warnings ──────────────────────────────────────────────────────────────────
// [MEDIUM-022] Escape engine-sourced strings before interpolation. Today m.text
// and m.detail come from bundled engine output (some now include printer.name
// via HIGH-012 templating) — safe in-tree, but shareable-profile-URL work or a
// future user-editable printer import would make this live XSS without escHtml.
function renderWarnings(warnings) {
  document.getElementById('warningsBar').innerHTML = warnings
    .map(m => {
      const body = m.detail
        ? `<strong>${escHtml(m.text)}</strong> ${escHtml(m.detail)}`
        : escHtml(m.text);
      return `<div class="warning-item"><span class="warn-icon">⚠</span><span>${body}</span></div>`;
    })
    .join('');
}

// ── Pre-print checklist ───────────────────────────────────────────────────────
function renderChecklist(items) {
  const el = document.getElementById('checklistPanel');
  if (!items || items.length === 0) { el.innerHTML = ''; return; }

  // Split critical and normal items for display order
  const critical = items.filter(i => i.critical);
  const normal   = items.filter(i => !i.critical);
  const ordered  = [...critical, ...normal];

  const T = Engine.t;
  el.innerHTML = `
    <div class="checklist">
      <div class="checklist-header">
        <span class="checklist-title">${T('checklistTitle')}</span>
        <span class="checklist-count">${items.length} ${T('checklistSteps')}</span>
      </div>
      <div class="checklist-items">
        ${ordered.map(item => `
          <div class="checklist-item${item.critical ? ' critical' : ''}">
            <span class="checklist-icon">${item.critical ? '⚠' : '✓'}</span>
            <div class="checklist-text">
              <span class="checklist-step">${item.text}</span>
              ${item.detail ? `<span class="checklist-detail">${item.detail}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

// ── Filament Panel ────────────────────────────────────────────────────────────
function renderFilamentPanel(filament, nozzle) {
  const T     = Engine.t;
  // Slicer-aware section labels: try slicer-specific key first, fall back to default
  const FS = (key) => { const sk = key + '_' + Engine.getActiveSlicer(); const v = T(sk); return v !== sk ? v : T(key); };
  const mvs      = filament.max_mvs[nozzle.size] || '—';
  // Always compute advanced temps so we can show initial vs other in both modes
  const advTemps = Engine.getAdvancedFilamentSettings(state);
  // Advanced-only extras (cooling details, retraction, PA) — only in advanced mode
  const adv      = currentMode === 'advanced' ? advTemps : null;

  // Smart collapse: if initial === other, show one row with "(both layers)" note
  const nozzleSame = advTemps && advTemps.initial_layer_temp === advTemps.other_layers_temp;
  const bedSame    = advTemps && advTemps.initial_layer_bed_temp === advTemps.other_layers_bed_temp;

  let html = '';

  // [IMPL-041 / DQ-1-followup] pull prov sidecars for this render pass.
  const aP = advTemps?._prov || {};
  const fP = filament?._prov || {};

  if (advTemps) {
    // Advanced mode always shows the layer-split rows (parity with iOS commit
    // 3a59cd1). Simple keeps the smart collapse so the summary stays compact.
    const isAdvanced = currentMode === 'advanced';
    html += `<div class="setting-section-label">${FS('secNozzleTemp')}</div>`;
    if (isAdvanced || !nozzleSame) {
      html += row(T('rowInitLayer'),   advTemps.initial_layer_temp,  'val-temp', aP.initial_layer_temp);
      html += row(T('rowOtherLayers'), advTemps.other_layers_temp,   'val-temp', aP.other_layers_temp);
    } else {
      html += row(T('rowNozzleTemp'), advTemps.initial_layer_temp + ' — both layers', 'val-temp', aP.initial_layer_temp);
    }
    html += `<div class="setting-section-label">${FS('secBedTemp')}</div>`;
    if (isAdvanced || !bedSame) {
      html += row(T('rowInitLayer'),   advTemps.initial_layer_bed_temp, 'val-temp', aP.initial_layer_bed_temp);
      html += row(T('rowOtherLayers'), advTemps.other_layers_bed_temp,  'val-temp', aP.other_layers_bed_temp);
    } else {
      html += row(T('rowBedTemp'), advTemps.initial_layer_bed_temp + ' — both layers', 'val-temp', aP.initial_layer_bed_temp);
    }
  } else {
    // Fallback (no material data)
    const temps = Engine.getAdjustedTemps(state.material, state.environment, state.nozzle, state.speed, state.printer);
    const tP = temps?._prov || {};
    html += `<div class="setting-section-label">${FS('secTemps')}</div>`;
    html += row(T('rowNozzleTemp'), temps.nozzle, 'val-temp', tP.nozzle);
    html += row(T('rowBedTemp'),    temps.bed,    'val-temp', tP.bed);
  }

  html += `
    <div class="setting-section-label">${FS('secCooling')}</div>
    ${row(T('rowCoolingFan'), filament.cooling_fan, undefined, fP.cooling_fan)}`;

  if (adv) {
    // v1.0.4 Phase 1.5 HIGH-01: render env-scaled fan_min_speed.value with its
    // inline S-wrapped prov sidecar; not the raw cooling_fan_min material default.
    const fanMinHtml = adv.fan_min_speed != null
      ? row(T('rowFanMin'), `${adv.fan_min_speed.value}%`, undefined, adv.fan_min_speed)
      : '';
    html += `
      ${fanMinHtml}
      ${row(T('rowFanOverhang'), adv.cooling_fan_overhang, undefined, aP.cooling_fan_overhang)}
      ${row(T('rowSlowLayer'),   adv.slow_layer_time,      undefined, aP.slow_layer_time)}`;
  }

  html += `
    <div class="setting-section-label">${FS('secSpeedLimit')}</div>
    ${row(T('rowMVS'), mvs, 'val-info', fP.max_mvs)}
    <div class="setting-section-label">${T('secSetup')}</div>
    ${row(T('rowBuildPlate'), filament.build_plate)}
    ${row(T('rowAMS'),        filament.ams ? T('valYes') : T('valNo'), filament.ams ? 'val-ok' : 'val-no')}
    ${row(T('rowDrying'),     filament.drying)}
    ${row(T('rowEnclosure'),  filament.enclosure)}`;

  if (adv) {
    html += `
      <div class="setting-section-label adv-label">${FS('secAdvExtrusion')}</div>
      ${row(T('rowPA'),          adv.pressure_advance,    'val-info', aP.pressure_advance)}
      ${row(T('rowFlow'),        adv.flow_ratio,          'val-info', aP.flow_ratio)}
      ${row(T('rowRetractLen'),  adv.retraction_distance, undefined, aP.retraction_distance)}
      ${row(T('rowRetractSpd'),  adv.retraction_speed,    undefined, aP.retraction_speed)}`;
  }

  if (filament.notes.length) {
    // [MEDIUM-022] Notes come from materials.json — bundled, safe today, but
    // escape for defence-in-depth in case a future import path feeds user text.
    html += `<div class="filament-notes">${filament.notes.map(n => `<div class="filament-note">${escHtml(n)}</div>`).join('')}</div>`;
  }

  document.getElementById('filamentSettings').innerHTML = html;
}

// [IMPL-041 / DQ-1-followup] Optional `prov` 4th arg. When Advanced mode is
// on and prov is non-null, render the same ⓘ icon + native title tooltip as
// the profile panel (app.js:1270). Qualitative rows (build plate, AMS, drying,
// enclosure) pass no prov and render bare.
const row = (label, value, cls, prov) => {
  const showProv = currentMode === 'advanced' && prov;
  const provTitle = showProv
    ? `Source: ${prov.source}${prov.ref ? ` — ${prov.ref}` : ''}`
    : '';
  const provIcon = showProv
    ? ` <span class="prov-icon" title="${escHtml(provTitle)}">ⓘ</span>`
    : '';
  return `<div class="setting-row">
     <span class="setting-name">${label}${provIcon}</span>
     <span class="setting-value${cls ? ' ' + cls : ''}">${value}</span>
   </div>`;
};

// ── Profile Panel ─────────────────────────────────────────────────────────────
function renderProfilePanel(profile) {
  const nav      = document.getElementById('profileTabNav');
  const contents = document.getElementById('profileTabContents');
  const banner   = document.getElementById('compareBanner');

  const T = Engine.t;

  // Render comparison banner
  // [MEDIUM-022] comparisonProfile.label is the highest-risk XSS sink here —
  // it reflects the printer/material selection at compare-lock time, today
  // engine-sourced but a shareable-URL feature would make it user-writable.
  if (comparisonProfile) {
    banner.innerHTML = `
      <div class="compare-banner">
        <span>${T('compareLocked')} <strong>${escHtml(comparisonProfile.label)}</strong></span>
        <div class="compare-col-tags">
          <span class="col-tag-a">${T('compareColA')}</span>
          <span class="col-tag-b">${T('compareColB')}</span>
        </div>
      </div>`;
  } else {
    banner.innerHTML = '';
  }

  nav.innerHTML = Engine.PROFILE_TABS.map(tab =>
    `<button class="tab-btn${tab.id === activeTabId ? ' active' : ''}" data-tab="${tab.id}">${tab.label}</button>`
  ).join('');

  contents.innerHTML = Engine.PROFILE_TABS.map(tab => {
    const aProfile = comparisonProfile?.profile || {};

    const renderParam = p => {
      const item = profile[p];

      if (comparisonProfile) {
        const aItem = aProfile[p];
        const aVal  = aItem?.value ?? '—';
        const bVal  = item?.value  ?? '—';
        const same  = aVal === bVal;
        const aCls  = (same || aVal === '—') ? 'same' : '';
        const bCls  = (same || bVal === '—') ? 'same' : '';
        // [MEDIUM-022] Escape engine-sourced values + why text. PARAM_LABELS
        // are bundled English constants — safe as-is.
        return `
          <div class="setting-row comparing">
            <span class="setting-name">${Engine.PARAM_LABELS[p]}</span>
            <span class="setting-value val-cmp-a ${aCls}">${escHtml(aVal)}</span>
            <span class="setting-value val-cmp-b ${bCls}">${escHtml(bVal)}</span>
          </div>
          ${item?.why ? `<div class="setting-why">${escHtml(item.why)}</div>` : ''}`;
      }

      // [MEDIUM-022] Same as above for the non-compared view.
      // [IMPL-041 / DQ-1 commit 4] Provenance indicator — small ⓘ icon after
      // the param label when we're in Advanced view AND the emission has a
      // non-null prov tag. Native `title` on the icon gives a no-JS hover
      // tooltip with "source — ref". Pros can inspect every number's origin;
      // beginners in Simple view never see the icon.
      const showProv = currentMode === 'advanced' && item && item.prov;
      const provTitle = showProv
        ? `Source: ${item.prov.source}${item.prov.ref ? ` — ${item.prov.ref}` : ''}`
        : '';
      const provIcon = showProv
        ? ` <span class="prov-icon" title="${escHtml(provTitle)}">ⓘ</span>`
        : '';
      return `
        <div class="setting-row">
          <span class="setting-name">${Engine.PARAM_LABELS[p]}${provIcon}</span>
          <span class="setting-value val-ok">${escHtml(item.value)}</span>
        </div>
        ${item.why ? `<div class="setting-why">${escHtml(item.why)}</div>` : ''}`;
    };

    let body = '';

    if (comparisonProfile) {
      const eligible = tab.params.filter(p => profile[p] || aProfile[p]);
      if (eligible.length === 0) {
        body = `<div class="no-settings">${T('noSettingsComp')}</div>`;
      } else {
        const colHeader = `
          <div class="compare-col-header-row">
            <span></span>
            <span class="ch-a">${T('compareHdrA')}</span>
            <span class="ch-b">${T('compareHdrB')}</span>
          </div>`;
        body = colHeader;
        for (const section of tab.sections) {
          const secEligible = section.params.filter(p => profile[p] || aProfile[p]);
          if (secEligible.length === 0) continue;
          body += `<div class="setting-section-label">${section.label}</div>`;
          body += secEligible.map(renderParam).join('');
        }
      }
    } else {
      let hasAny = false;
      for (const section of tab.sections) {
        const eligible = section.params.filter(p => profile[p]);
        if (eligible.length === 0) continue;
        const visible = currentMode === 'advanced'
          ? eligible
          : eligible.filter(p => profile[p].mode === 'simple');
        if (visible.length === 0) continue;
        hasAny = true;
        body += `<div class="setting-section-label">${section.label}</div>`;
        body += visible.map(renderParam).join('');
      }
      if (!hasAny) {
        body = `<div class="no-settings">${T('noSettings')}</div>`;
      }
    }

    const descHtml = tab.desc ? `<p class="tab-desc">${tab.desc}</p>` : '';
    return `<div class="tab-content${tab.id === activeTabId ? ' active' : ''}" data-tab="${tab.id}">${descHtml}${body}</div>`;
  }).join('');

  // Tab switching — update activeTabId so it persists across renders
  nav.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTabId = btn.dataset.tab;
      nav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      contents.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      contents.querySelector(`[data-tab="${activeTabId}"]`).classList.add('active');
    });
  });
}
