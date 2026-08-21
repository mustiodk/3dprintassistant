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
    else if (restored === 'gear' && _gearBootNotice) showToast(_gearBootNotice);
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
  if (restorePersistedState()) return 'storage';
  // Third branch (My Gear): only reached when there is neither a share link nor
  // a session to restore, so a restored session ALWAYS wins (spec §3.3 — this
  // is what protects IMPL-042 share links). See applyBootGear for why the
  // 'storage' branch legitimately wins on every boot after the first.
  return applyBootGear() ? 'gear' : false;
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
  // IMPL-044 W3: the share affordance maps mine→safe (encodeForShare) — the
  // live address bar (syncUrl) keeps mine so refresh restores the selection.
  const qs  = StateCodec.encodeForShare(stateObj);
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
  document.getElementById('navSupport').textContent        = T('navSupport') + ' ♥';

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
  renderGearSection();

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

  // The catalog-news line is spent once the user has actually looked at the
  // catalog — which means the catalog SURFACE, not the section. A returning user
  // with a saved printer sees a collapsed picker; the click that expands it is the
  // one that would let them look, so spending the news on it discharges D11 before
  // it does any work. Brand chips, the model panel and the search box only.
  const pickerSection = document.getElementById('printerPickerSection');
  if (pickerSection) {
    const CATALOG_SURFACE = '#chips_printer, #printerModelPanel, .printer-search-wrap, #printerSearchResults';
    const spend = (e) => {
      if (!e.target.closest(CATALOG_SURFACE)) return;
      pickerSection.removeEventListener('click', spend);
      markCatalogSeenNow();
    };
    pickerSection.addEventListener('click', spend);
    // Typing a search is looking at the catalog just as much as clicking is.
    const si = document.getElementById('printerSearchInput');
    if (si) si.addEventListener('input', markCatalogSeenNow, { once: true });
  }

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
  // D10 — the user's own brands lead the picker, derived from their gears and
  // never stored. This is a GROUPING, not a filter: the full catalog still
  // follows underneath, and the engine's compatibility dimming is untouched.
  const byId = Object.create(null);
  brands.forEach(b => { byId[b.id] = b; });
  const ownIds = gearOwnedBrandIds().filter(id => !!byId[id]);

  // A derived brand that is not primary has no chip in the catalog group at
  // all while "More" is folded, which would make the user's own brand look
  // like it had vanished from the catalog. Open the full list instead.
  if (ownIds.some(id => !byId[id].primary)) pickerShowMore = true;

  let n = 0;
  const addChip = (b, own) => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (pickerBrand === b.id ? ' selected' : '') + (own ? ' gear-owned' : '');
    chip.innerHTML = `<span>${b.name}</span><span class="chip-desc">${b.count} models</span>`;
    chip.style.animationDelay = `${n++ * 0.03}s`;
    chip.style.animation = 'chipPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both';
    chip.addEventListener('click', () => selectBrand(b.id));
    el.appendChild(chip);
  };

  if (ownIds.length) {
    el.appendChild(gearGroupLabel(Engine.t('gearYours')));
    ownIds.forEach(id => addChip(byId[id], true));
    el.appendChild(gearGroupLabel(Engine.t('gearAllBrands')));
  }

  const visible = pickerShowMore ? brands : brands.filter(b => b.primary);
  visible.forEach(b => addChip(b, false));

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

  const modelChip = (m, delay, own) => {
    const chip = document.createElement('button');
    chip.className = 'model-chip' + (state.printer === m.id ? ' selected' : '') + (own ? ' gear-owned' : '');
    chip.innerHTML = `<span>${m.name}</span><span class="chip-desc">${m.desc}</span>`;
    chip.style.animationDelay = `${delay}s`;
    chip.addEventListener('click', () => selectModel(m.id));
    return chip;
  };
  const seriesGroup = (labelText, delay) => {
    const group = document.createElement('div');
    group.className = 'series-group';
    group.style.animationDelay = `${delay}s`;
    const label = document.createElement('div');
    label.className = 'series-label';
    label.textContent = labelText;
    group.appendChild(label);
    const chips = document.createElement('div');
    chips.className = 'chips';
    chips.style.gap = '8px';
    group.appendChild(chips);
    return { group, chips };
  };

  // D10 — the user's own MODELS lead the list too, not only their brands.
  const flat = Object.create(null);
  groups.forEach(s => s.models.forEach(m => { flat[m.id] = m; }));
  const ownModels = gearOwnedPrinterIds()
    .filter(id => !!flat[id])
    .filter(id => { const p = Engine.getPrinter(id); return !!p && p.manufacturer === brandId; });
  let offset = 0;
  if (ownModels.length) {
    const yours = seriesGroup(Engine.t('gearYours'), 0);
    ownModels.forEach((id, mi) => yours.chips.appendChild(modelChip(flat[id], mi * 0.04, true)));
    inner.appendChild(yours.group);
    offset = 1;
  }

  groups.forEach((s, si) => {
    const g = seriesGroup(s.label, (si + offset) * 0.06);
    s.models.forEach((m, mi) => g.chips.appendChild(modelChip(m, (si + offset) * 0.06 + mi * 0.04, false)));
    inner.appendChild(g.group);
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
  syncPersonalTuning();   // IMPL-044 W3 — before getFilters (Mine segment visibility)
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
  // [IMPL-044 W3] Tuning may have changed while away (accept/revert/import in
  // the Workshop) — rebuild so the conditional Mine segment reflects it.
  if (view === 'configure') { buildFilters(); render(); }
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
// Accepted offsets feed the engine's Mine tier via syncPersonalTuning() below
// (IMPL-044 W3): injected per render, consumed only in profileMode 'mine'.
let _workshopTuning = null;

// [IMPL-044 W3] Per-render engine injection. Runs before anything consults the
// engine (buildFilters + render): injects the current pair's accepted offsets
// (or clears), and degrades a 'mine' selection to 'safe' when no tuning exists
// for the pair (share-URL recipients, fully-reverted tuning, pair switches) so
// the visible chip stays truthful. The engine additionally guards via pairKey
// validation + mine-mode gating — this sync is the UX layer, not the safety.
function syncPersonalTuning() {
  let payload = null;
  if (state.printer && state.material) {
    const wt = getWorkshopTuning();
    if (wt) {
      const offsets = wt.acceptedFor(state.printer, state.material);
      if (Object.keys(offsets).length) {
        payload = { pairKey: `${state.printer}|${state.material}`, offsets };
      }
    }
  }
  Engine.setPersonalTuning(payload);
  if (state.profileMode === 'mine' && !payload) state.profileMode = 'safe';
}

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
    // D-3 split the value clock from the journal clock, so `updated` alone no
    // longer moves when the user logs a print outcome. The card date means
    // "last activity" to a reader, so derive it from both rather than letting
    // a storage-correctness fix silently change what the UI shows.
    const activity = [p.updated, p.journal_updated, p.created].filter(Boolean).sort().pop() || '';
    const date    = activity.slice(0, 10);
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

// ── My Gear (Train 1) ─────────────────────────────────────────────────────────
// A gear is a SHORTCUT: the answers that do not change between prints, saved
// after a completed run and re-applied in one tap. It is not an inventory.
//
// This half is UI only. `gear-store.js` owns the `3dpa_gear_v1` envelope
// (shape), `gear-validate.js` owns content validation and the apply
// bookkeeping (`inspectGear` / `applyGearToState`). Neither is modified here.
//
// Spec: docs/superpowers/specs/2026-08-20-gear-model-v2-spec.md (RATIFIED).
// Decisions: docs/reviews/2026-08-20-gear-model-owner-decisions.md D1-D11.

// Spec §1.1 — the seven pre-checked defaults. An offer, not a schema: every
// other answered field is listed unchecked and tickable (D3/D5).
const GEAR_DEFAULT_FIELDS = ['printer', 'nozzle', 'material', 'build_plate',
                             'environment', 'profileMode', 'extruder_type'];
// Spec §2.3 — `labels` is a rendering fallback for exactly the four fields
// whose values are catalog ids that can disappear. Every other field holds an
// engine enum value, localized at render time, which needs no snapshot.
const GEAR_LABEL_FIELDS   = ['printer', 'nozzle', 'material', 'build_plate'];
const GEAR_CARD_LIMIT     = 3;      // D8: active gear + the two most recent
const GEAR_ALL_THRESHOLD  = 4;      // D8: a door at four

// GearStore is null when localStorage is unavailable (private browsing), and
// the validators are separate globals — one guard covers the whole feature.
function gearAvailable() {
  return !!(typeof GearStore !== 'undefined' && GearStore
    && typeof inspectGear === 'function' && typeof applyGearToState === 'function');
}

// ── Engine metadata, injected rather than reached for ────────────────────────
// gear-validate.js never imports the engine; it takes catalogs and filter
// metadata as arguments. This is the only place that bridges the two.

function gearFilterIndex() {
  const idx = Object.create(null);
  Engine.getFilters(state).forEach(f => {
    // Null-prototype: filter keys and item ids reach this from a stored
    // envelope, and `__proto__` as a key must not resolve through
    // Object.prototype and pick up a name that was never there.
    const items = Object.create(null);
    (f.items || []).forEach(i => { items[i.id] = i.name; });
    idx[f.key] = { key: f.key, label: f.label, multi: !!f.multi, itemName: items };
  });
  return idx;
}

function gearCatalogs() {
  const filters = Engine.getFilters(state);
  const ids = key => {
    const f = filters.find(x => x.key === key);
    return new Set((f && f.items ? f.items : []).map(i => i.id));
  };
  return {
    printers:  ids('printer'),
    materials: ids('material'),
    nozzles:   ids('nozzle'),
    plates:    ids('build_plate'),
  };
}

// ── Catalog news (D11) ───────────────────────────────────────────────────────
// D10 sorts the user's own brands and printers to the top, which would otherwise
// make a newly added printer invisible to anyone who has gears. This line is the
// counterweight — it exists only because of that reordering.
//
// Computed ONCE per page load and cached, because markCatalogSeen fires straight
// away: without the cache the line would vanish on the section's next repaint,
// which happens on nearly every interaction.
let _catalogNews;

function gearCatalogNews() {
  if (_catalogNews !== undefined) return _catalogNews;
  _catalogNews = { fresh: 0, total: 0 };
  if (!gearAvailable()) return _catalogNews;

  // Brand counts, not the filtered printer list — getFilters() narrows by the
  // current selection, so it is not a catalog total.
  const total = Engine.getBrands().reduce((n, b) => n + (b.count || 0), 0);
  const seen  = GearStore.getSettings().catalog_seen;
  // First run has nothing to compare against: 83 printers are not 83 arrivals.
  const first = !Object.prototype.hasOwnProperty.call(seen, 'printers');

  // First run shows nothing: with no baseline, 83 printers are not 83 arrivals.
  // The baseline is NOT recorded here — recording it would be a write caused by a
  // render, which is the whole defect. markCatalogSeenNow() records it on the same
  // user action that spends any other news, so a user who never opens the picker
  // simply keeps seeing no line, which is correct.
  _catalogNews = {
    fresh: first ? 0 : (GearStore.catalogNews({ printers: total }).printers || 0),
    total: total,
  };
  return _catalogNews;
}

// Called when the user opens the printer picker: they have now seen the catalog,
// so the news is spent. Deliberately NOT called from render() — that would make
// a read outrank a write (spec §4.2). The line stays visible for the rest of
// this page load, because vanishing under the cursor is worse than one extra
// paint's worth of staleness; it is gone on the next load.
function markCatalogSeenNow() {
  if (!gearAvailable()) return;
  const n = gearCatalogNews();
  if (!n.total) return;
  GearStore.markCatalogSeen({ printers: n.total });
}

function gearArchivedCount() {
  if (!gearAvailable()) return 0;
  try { return GearStore.listArchived().length; } catch (_) { return 0; }
}

function gearHasArchived() { return gearArchivedCount() > 0; }

function gearMeta() {
  return {
    // The whole filter list, so EVERY enum field is validated against its own
    // item vocabulary — not only the four catalog-backed ones. Enum values
    // disappear too.
    filters: Engine.getFilters(state),
    // Spec §3.2 — `mine` is valid only for the exact printer+material pair the
    // user holds accepted Workshop tuning for, so this is a per-pair predicate
    // over the GEAR's values, never a global boolean read off app state.
    mineAvailable: (printer, material) => {
      if (!printer || !material) return false;
      const wt = getWorkshopTuning();
      if (!wt) return false;
      try { return Object.keys(wt.acceptedFor(printer, material) || {}).length > 0; }
      catch (_) { return false; }
    },
  };
}

function gearDeps() {
  return {
    // Spec §3.3 — unpinned fields are cleared so the wizard asks for them.
    // Without this the previous run's answers survive and a partial gear
    // silently inherits someone else's use case and surface finish.
    resetFields: () => {
      Object.keys(state).forEach(k => { state[k] = Array.isArray(state[k]) ? [] : null; });
      expandedSections.clear();
    },
    setActiveSlicer:     id => Engine.setActiveSlicer(id),
    getSlicerForPrinter: id => Engine.getSlicerForPrinter(id),
    setExpandedBrand:    brandId => {
      pickerBrand = brandId;
      const b = Engine.getBrands().find(x => x.id === brandId);
      if (b && !b.primary) pickerShowMore = true;
    },
    collapsePicker:      () => { pickerCollapsed = true; },
    printerRow:          id => Engine.getPrinter(id),
  };
}

// ── Reading the list ─────────────────────────────────────────────────────────

function gearList() {
  if (!gearAvailable()) return [];
  try { return GearStore.list(); } catch (_) { return []; }
}

// Spec §4.3 — `active_gear` is a HINT, not a guarantee. If it does not resolve
// to a live gear, fall back to the most recently used non-archived gear;
// GearStore.list() is already in that order. The pointer is NOT repaired here:
// read-side repair never writes, and it resolves again on its own once the
// missing record arrives.
function gearActiveId(gears) {
  if (!gears.length) return null;
  let hint = null;
  try { hint = GearStore.getSettings().active_gear; } catch (_) { hint = null; }
  if (hint && gears.some(g => g.id === hint && !g.invalid)) return hint;
  // §4.3's fallback exists so the pointer RESOLVES. An unusable row resolves to
  // nothing, so it is skipped rather than being handed the badge and the boot.
  const usable = gears.filter(g => !g.invalid);
  if (usable.length) return usable[0].id;
  return null;
}

// D8 — the active gear leads, then the two most recently used. An unusable row
// never takes a slot from a working gear: it is shown so it can be dealt with,
// which is not the same as being one of the three shortcuts on offer.
function gearCardOrder(gears, activeId) {
  const active  = gears.filter(g => g.id === activeId);
  const rest    = gears.filter(g => g.id !== activeId && !g.invalid);
  const broken  = gears.filter(g => g.id !== activeId && g.invalid);
  return active.concat(rest, broken).slice(0, GEAR_CARD_LIMIT);
}

// ── Rendering one pinned value ───────────────────────────────────────────────
// A value that no longer resolves renders from the label captured at save time
// (spec §2.3) and is reported stale. NO repair is offered — the repair
// interaction is undesigned, and offering a fix we have not built is worse
// than showing the state plainly.
function gearFieldDisplay(gear, key, idx) {
  const fields = (gear && gear.fields) || {};
  const raw    = fields[key];
  const f      = idx[key];
  const labels = (gear && gear.labels) || {};
  const lab    = Object.prototype.hasOwnProperty.call(labels, key) ? labels[key] : null;

  if (Array.isArray(raw) && raw.length === 0) {
    // `[]` is "pinned as none" — distinct from the key being absent, which
    // means "ask me".
    return { text: Engine.t('gearPinNone'), stale: false };
  }
  const values = Array.isArray(raw) ? raw : [raw];
  let stale = false;
  const parts = values.map((v, i) => {
    if (typeof v !== 'string') { stale = true; return String(v); }
    if (f && f.itemName[v]) return f.itemName[v];
    stale = true;
    const fallback = Array.isArray(lab) ? lab[i] : (i === 0 ? lab : null);
    return (typeof fallback === 'string' && fallback) ? fallback : v;
  });
  return { text: parts.join(', '), stale };
}

// D1 — most users own one printer and keep several gears for it, so nozzle and
// filament are what tell two cards apart. Printer is secondary.
function gearHeadline(gear, idx) {
  const parts = [];
  ['nozzle', 'material'].forEach(k => {
    if (!Object.prototype.hasOwnProperty.call(gear.fields || {}, k)) return;
    const d = gearFieldDisplay(gear, k, idx);
    if (d.text) parts.push(d.text);
  });
  return parts.length ? parts.join(' · ') : gearDisplayName(gear);
}

// The hardware name D7 pre-fills with. Used to decide whether a card should
// show the gear's name at all — repeating "X1 Carbon · 0.4 mm · PLA Basic"
// under a line that already says it is noise.
function gearAutoName(gear, idx) {
  return ['printer', 'nozzle', 'material']
    .filter(k => Object.prototype.hasOwnProperty.call(gear.fields || {}, k))
    .map(k => gearFieldDisplay(gear, k, idx).text)
    .filter(Boolean).join(' · ');
}

function gearStateBadge(stateName) {
  if (stateName === 'stale')    return Engine.t('gearStateStale');
  if (stateName === 'degraded') return Engine.t('gearStateDegraded');
  return '';
}

// ── The section at the top of Configure ──────────────────────────────────────

function renderGearSection() {
  const sec = document.getElementById('gearSection');
  if (!sec) return;
  const T = Engine.t;

  const head   = document.getElementById('gearSectionHead');
  const grid   = document.getElementById('gearGrid');
  const empty  = document.getElementById('gearEmpty');
  const allBtn = document.getElementById('gearAllBtn');
  const addBtn = document.getElementById('gearAddBtn');

  if (!gearAvailable()) { sec.style.display = 'none'; return; }
  sec.style.display = '';

  const gears = gearList();

  const count = document.getElementById('gearSectionCount');
  const news  = document.getElementById('gearNews');

  document.getElementById('gearSectionTitle').textContent  = T('gearSectionTitle');
  document.getElementById('gearAddBtn').textContent        = T('gearAddBtn');
  document.getElementById('gearEmptyAddBtn').textContent   = T('gearAddYours');
  document.getElementById('gearEmptyText').textContent     = T('gearEmptyLine');

  // First run. One quiet dashed row — a sentence saying what a gear is, and the
  // button that starts one. The configurator below keeps full weight.
  if (!gears.length) {
    grid.style.display  = 'none';
    grid.innerHTML      = '';
    empty.style.display = '';
    count.textContent   = '';
    addBtn.style.display = 'none';      // the empty row carries its own
    // Shown here only because something IS archived, so the count must include
    // what the user is looking for — "All gears (0)" points at an empty room.
    allBtn.textContent   = T('gearAllBtn').replace('{n}', String(gearArchivedCount()));
    allBtn.style.display = gearHasArchived() ? '' : 'none';
    news.style.display   = 'none';
    return;
  }

  grid.style.display  = '';
  empty.style.display = 'none';
  addBtn.style.display = '';
  // Usable gears only: an unusable row is shown so it can be seen and dealt with,
  // but it is not one of the user's shortcuts and must not be counted as one.
  const usable = gears.filter(g => !g.invalid).length;
  const arch   = gearArchivedCount();
  count.textContent  = T('gearSavedCount').replace('{n}', String(usable));
  allBtn.textContent = T('gearAllBtn').replace('{n}', String(gears.length + arch));
  // Total rows, not usable ones: an invalid row still occupies the grid's budget,
  // so if it pushes a working gear off, the door must be open to reach it.
  allBtn.style.display = (gears.length >= GEAR_ALL_THRESHOLD || arch > 0) ? '' : 'none';

  const idx      = gearFilterIndex();
  const cats     = gearCatalogs();
  const meta     = gearMeta();
  const activeId = gearActiveId(gears);

  grid.innerHTML = gearCardOrder(gears, activeId).map((g, i) => {
    const r        = inspectGear(g, cats, meta);
    const headline = gearHeadline(g, idx);
    const printer  = Object.prototype.hasOwnProperty.call(g.fields || {}, 'printer')
      ? gearFieldDisplay(g, 'printer', idx).text : '';
    // Only a name the USER typed earns its own line. gearDisplayName falls back
    // to the captured labels when `name` is empty, which would repeat the two
    // lines above it verbatim.
    const name     = (typeof g.name === 'string') ? g.name.trim() : '';
    const auto     = gearAutoName(g, idx);
    const showName = !!name && name !== auto && name !== headline;
    const badge    = gearStateBadge(r.state);
    return `
      <div class="gear-card${g.id === activeId ? ' is-default' : ''}" style="animation-delay:${i * 0.05}s">
        <button class="gear-card-body" data-id="${escHtml(g.id)}">
          <span class="gear-card-top">
            <span class="gear-card-printer">${escHtml(printer || '—')}</span>
            ${g.id === activeId ? `<span class="gear-dot is-default"><i></i>${T('gearDefaultBadge')}</span>` : ''}
            ${badge ? `<span class="gear-dot is-warn"><i></i>${escHtml(badge)}</span>` : ''}
          </span>
          <span class="gear-card-headline">${escHtml(headline)}</span>
          ${showName ? `<span class="gear-card-nick">${escHtml(name)}</span>` : ''}
        </button>
        ${g.invalid
          ? `<span class="gear-run is-dead" title="${escHtml(T('gearRunUnavailable'))}" aria-disabled="true">
               <span class="gear-run-label">${T('gearUnavailable')}</span>
             </span>`
          : `<button class="gear-run" data-id="${escHtml(g.id)}" title="${escHtml(T('gearGenerate'))}">
               <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d="M3 1.5 L12 7 L3 12.5 Z" fill="currentColor"/></svg>
               <span class="gear-run-label">${T('gearRun')}</span>
             </button>`}
      </div>`;
  }).join('');

  // D4 — two tap targets. The body opens the review overlay; the generate
  // control runs straight through.
  grid.querySelectorAll('.gear-card-body').forEach(b =>
    b.addEventListener('click', () => openGearReview(b.dataset.id)));
  // `button.gear-run`, not `.gear-run` — the dead rail on an invalid gear carries
  // the same class for styling, and wiring it made a click fall through to
  // applyGear(undefined) and toast "That gear is no longer available", which is
  // both wrong (the gear is there) and confusing.
  grid.querySelectorAll('button.gear-run').forEach(b =>
    b.addEventListener('click', () => applyGear(b.dataset.id, true)));

  const n = gearCatalogNews();
  if (n.fresh > 0) {
    news.style.display = '';
    news.textContent = T(n.fresh === 1 ? 'gearNewsOne' : 'gearNewsMany')
      .replace('{n}', String(n.fresh))
      .replace('{total}', String(n.total));
  } else {
    news.style.display = 'none';
  }
}

// ── Applying ─────────────────────────────────────────────────────────────────

function gearApplyMessage(gear, r) {
  const T    = Engine.t;
  const name = gearDisplayName(gear);
  if (r.state === 'stale')    return T('gearNoticeStale').replace('{name}', name);
  if (r.state === 'degraded') return T('gearNoticeDegraded').replace('{name}', name);
  return T('gearApplied').replace('{name}', name);
}

function applyGear(id, scroll) {
  if (!gearAvailable()) return;
  const g = GearStore.get(id);
  if (!g || g.archived_at) { showToast(Engine.t('gearMissing')); renderGearSection(); return; }

  // The sink, not the surfaces. `applyGearToState` calls resetFields()
  // unconditionally and only THEN discovers there is no printer to apply — so a
  // gear that cannot resolve one wipes the whole configuration, overwrites
  // active_gear with an id that can never resolve, and reports "Loaded".
  //
  // Three separate surfaces offered that action before this guard existed: the
  // card grid, the detail overlay, and the All-gears overlay — each found by a
  // different review round, each fixed on its own. They still refuse to OFFER it,
  // because an affordance that cannot work should not be drawn. This is the one
  // place a fourth surface cannot forget.
  if (g.invalid) { showToast(Engine.t('gearRunUnavailable')); return; }

  const r = inspectGear(g, gearCatalogs(), gearMeta());
  applyGearToState(r.resolved, state, gearDeps());

  // The printer did not resolve, so the picker has everything still to ask.
  // applyGearToState deliberately skips its bookkeeping in that case; undo the
  // collapse the previous selection left behind.
  if (!state.printer) {
    pickerBrand = null;
    pickerCollapsed = false;
    Engine.setActiveSlicer('bambu_studio');
  }

  GearStore.touch(g.id);            // last_used_at only — using is not editing
  GearStore.setActiveGear(g.id);

  // setView('configure') itself calls buildFilters() + render(), so it runs
  // FIRST — running it after restoreChipSelections() would rebuild the chips
  // and drop every selection this apply just made.
  if (currentView !== 'configure') setView('configure');
  buildFilters();
  restoreChipSelections();
  renderPrinterSummary();
  applyPickerCollapsed();
  render();
  renderGearSection();

  showToast(gearApplyMessage(g, r));
  if (scroll) gearScrollToWork();
}

function gearScrollToWork() {
  const results = document.getElementById('resultsLayout');
  const target = (results && results.style.display !== 'none')
    ? results : document.getElementById('filtersContainer');
  if (target && target.scrollIntoView) {
    requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
}

// D9 — the CTA always begins a fresh run at brand selection. The gear cards
// own the shortcut role, so this button owns "something different this time".
// It deliberately does NOT clear the default gear pointer: which gear is the
// default is a separate decision, made in the review overlay.
let _addGearArmed = false;

function armAddGear() {
  _addGearArmed = true;
  resetAll();
  const section = document.getElementById('printerPickerSection');
  if (section) section.classList.remove('collapsed');
  expandPrinterPicker();
  if (section && section.scrollIntoView) {
    requestAnimationFrame(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  showToast(Engine.t('gearAddHint'));
}

// Called from render() once the three required answers are in. Disarms first so a
// dismissed dialog does not immediately reopen on the next paint.
function maybeOfferArmedGearSave() {
  if (!_addGearArmed || !saveReady() || !gearAvailable()) return;
  _addGearArmed = false;
  openGearSaveDialog();
}

// ── Save after a run (D5/D6/D7) — the only way a gear is born ────────────────

let _gearSaveRows = [];
let _gearDupeArmed = false;

// Set equality on the pinned answers, matching the spec's rule that a reordering
// of a multi-valued field is the same value (§2.4 Array hygiene, amended
// 2026-08-21) — so a gear differing only in array order counts as a duplicate,
// not a new gear. KNOWN GAP: this does not dedupe before comparing, so a value
// array carrying a repeat (only reachable by hand-editing a share URL, since
// handleChipClick cannot produce one) would compare as different and skip the
// warning. Noted 2026-08-21, deliberately not fixed — the outcome is one
// un-warned duplicate gear, not data loss.
function _sameFieldSet(a, b) {
  const ak = Object.keys(a).sort(), bk = Object.keys(b).sort();
  if (ak.join('\u0000') !== bk.join('\u0000')) return false;
  for (let i = 0; i < ak.length; i++) {
    const x = a[ak[i]], y = b[ak[i]];
    const xa = Array.isArray(x), ya = Array.isArray(y);
    if (xa !== ya) return false;
    if (xa) {
      if (x.length !== y.length) return false;
      const xs = x.slice().sort(), ys = y.slice().sort();
      for (let j = 0; j < xs.length; j++) if (xs[j] !== ys[j]) return false;
    } else if (x !== y) return false;
  }
  return true;
}

function gearFindDuplicate(fields) {
  const live = gearList();
  for (let i = 0; i < live.length; i++) {
    if (_sameFieldSet(live[i].fields || {}, fields)) return live[i];
  }
  return null;
}

function openGearSaveDialog() {
  if (!gearAvailable() || !state.printer) return;
  const T   = Engine.t;
  const idx = gearFilterIndex();

  // Every field the user actually answered this run. Absent keys mean "ask me"
  // and are not offered — a gear pins answers, it does not invent them.
  const rows = [];
  Engine.getFilters(state).forEach(f => {
    const v = state[f.key];
    const answered = Array.isArray(v) ? v.length > 0 : (v !== null && v !== undefined && v !== '');
    if (!answered) return;
    const values = Array.isArray(v) ? v.slice() : [v];
    const names  = values.map(x => (idx[f.key] && idx[f.key].itemName[x]) || x);
    rows.push({
      key:      f.key,
      label:    f.label,
      value:    Array.isArray(v) ? values : values[0],
      display:  names.join(', '),
      // Labels are captured for the four catalog-backed fields ONLY, and
      // mirror the shape of the value they label (spec §2.3).
      labelValue: GEAR_LABEL_FIELDS.indexOf(f.key) !== -1
        ? (Array.isArray(v) ? names : names[0]) : null,
      required: f.key === 'printer',
      checked:  GEAR_DEFAULT_FIELDS.indexOf(f.key) !== -1,
    });
  });
  _gearSaveRows = rows;

  document.getElementById('gearSaveTitle').textContent     = T('gearSaveTitle');
  document.getElementById('gearSaveIntro').textContent     = T('gearSaveIntro');
  document.getElementById('gearSaveNameLabel').textContent = T('gearSaveNameLabel');
  document.getElementById('gearSaveConfirm').textContent   = T('gearSaveConfirm');
  _gearDupeArmed = false;   // a freshly opened dialog always asks once

  // D7 — pre-filled from hardware, and overwritable.
  const nameInput = document.getElementById('gearSaveName');
  nameInput.value = rows.filter(r => ['printer', 'nozzle', 'material'].indexOf(r.key) !== -1)
    .sort((a, b) => ['printer', 'nozzle', 'material'].indexOf(a.key)
                  - ['printer', 'nozzle', 'material'].indexOf(b.key))
    .map(r => r.display).join(' · ');

  const rowHtml = r => `
    <label class="gear-pick${r.required ? ' is-required' : ''}">
      <input type="checkbox" class="gear-pick-box" data-key="${escHtml(r.key)}"
             ${r.checked ? 'checked' : ''}${r.required ? ' disabled' : ''}/>
      <span class="gear-pick-text">
        <span class="gear-pick-label">${escHtml(r.label)}</span>
        <span class="gear-pick-value">${escHtml(r.display)}</span>
      </span>
      ${r.required ? `<span class="gear-badge">${T('gearSaveAlways')}</span>` : ''}
    </label>`;

  const defaults = rows.filter(r => r.checked);
  const optional = rows.filter(r => !r.checked);
  document.getElementById('gearSaveFields').innerHTML =
      `<div class="gear-pick-group-label">${T('gearSaveDefaults')}</div>`
    + defaults.map(rowHtml).join('')
    + (optional.length
        ? `<div class="gear-pick-group-label">${T('gearSaveOptional')}</div>` + optional.map(rowHtml).join('')
        : '');

  document.getElementById('gearSaveModal').showModal();
  requestAnimationFrame(() => { nameInput.focus(); nameInput.select(); });
}

function commitGearSave() {
  if (!gearAvailable()) return;
  const T = Engine.t;
  const chosen = new Set(['printer']);     // required, and its box is disabled
  document.querySelectorAll('#gearSaveFields .gear-pick-box').forEach(b => {
    if (b.checked) chosen.add(b.dataset.key);
  });

  const fields = {};
  const labels = {};
  _gearSaveRows.forEach(r => {
    if (!chosen.has(r.key)) return;
    fields[r.key] = r.value;
    if (r.labelValue !== null && r.labelValue !== undefined) labels[r.key] = r.labelValue;
  });

  const dupe = gearFindDuplicate(fields);
  if (dupe && !_gearDupeArmed) {
    _gearDupeArmed = true;
    document.getElementById('gearSaveConfirm').textContent = T('gearDupeConfirm');
    showToast(T('gearDupeWarn').replace('{name}', gearDisplayName(dupe)));
    return;
  }

  const name = (document.getElementById('gearSaveName').value || '').trim();
  const res  = GearStore.save({ name: name, fields: fields, labels: labels });

  // A write that fails is NEVER reported as a save, and `quota` stays
  // distinguishable from any other storage failure.
  if (!res.ok) {
    showToast(res.error === 'quota'        ? T('gearSaveQuota')
            : res.error === 'version-skew' ? T('gearSkew')
            :                                T('gearSaveFailed'));
    return;
  }

  GearStore.setActiveGear(res.gear.id);
  document.getElementById('gearSaveModal').close();
  showToast(T('gearSaved'));
  renderGearSection();
}

// ── Review overlay (D4) ──────────────────────────────────────────────────────

function openGearReview(id) {
  if (!gearAvailable()) return;
  const g = GearStore.get(id);
  if (!g) { showToast(Engine.t('gearMissing')); renderGearSection(); return; }

  const T    = Engine.t;
  const idx  = gearFilterIndex();
  const r    = inspectGear(g, gearCatalogs(), gearMeta());
  const live = gearList();
  const isDefault = gearActiveId(live) === g.id;

  // textContent, not innerHTML — the name is user-typed and untrusted.
  document.getElementById('gearReviewTitle').textContent = gearDisplayName(g);

  const fields = g.fields || {};
  const known  = Engine.getFilters(state)
    .filter(f => Object.prototype.hasOwnProperty.call(fields, f.key));
  const unknown = Object.keys(fields).filter(k => !idx[k]);

  const rowHtml = (label, key) => {
    const d = gearFieldDisplay(g, key, idx);
    return `
      <div class="gear-review-row">
        <span class="gear-review-key">${escHtml(label)}</span>
        <span class="gear-review-val${d.stale ? ' is-stale' : ''}">${escHtml(d.text)}${
          d.stale ? `<span class="gear-review-flag">${T('gearUnavailable')}</span>` : ''}</span>
      </div>`;
  };

  const note = r.state === 'stale'    ? T('gearStaleNote')
             : r.state === 'degraded' ? T('gearDegradedNote')
             : unknown.length         ? T('gearUnknownNote')
             : '';

  document.getElementById('gearReviewBody').innerHTML =
      (note ? `<p class="gear-note${r.state === 'stale' ? ' is-warn' : ''}">${escHtml(note)}</p>` : '')
    + `<div class="gear-review-list">`
    + known.map(f => rowHtml(f.label, f.key)).join('')
    + unknown.map(k => rowHtml(k, k)).join('')
    + `</div>`
    + `<div class="gear-review-actions">
         <button class="export-btn gear-primary-btn" id="gearReviewGenerate"${
           g.invalid ? ' disabled title="' + escHtml(T('gearRunUnavailable')) + '"' : ''}>${T('gearGenerate')}</button>
         <button class="export-btn" id="gearReviewRename">${T('gearRename')}</button>
         <button class="export-btn" id="gearReviewDefault"${
           isDefault || g.invalid ? ' disabled' : ''}${
           g.invalid ? ' title="' + escHtml(T('gearRunUnavailable')) + '"' : ''}>${
           isDefault ? T('gearIsDefault') : T('gearSetDefault')}</button>
         <button class="export-btn gear-archive-btn" id="gearReviewArchive">${T('gearArchive')}</button>
       </div>`;

  const modal = document.getElementById('gearReviewModal');
  document.getElementById('gearReviewGenerate').addEventListener('click', () => {
    modal.close();
    applyGear(g.id, true);
  });
  document.getElementById('gearReviewRename').addEventListener('click', () => {
    modal.close();
    openNameModal(T('gearRenameTitle'), gearDisplayName(g), name => {
      const res = GearStore.update(g.id, { name: name });
      showToast(res.ok ? T('gearRenamed')
        : res.error === 'version-skew' ? T('gearSkew') : T('gearSaveFailed'));
      renderGearSection();
    });
  });
  const defBtn = document.getElementById('gearReviewDefault');
  if (!isDefault && !g.invalid) defBtn.addEventListener('click', () => {
    const res = GearStore.setActiveGear(g.id);
    modal.close();
    showToast(res && res.ok === false ? T('gearSaveFailed') : T('gearDefaultSet'));
    renderGearSection();
  });
  // Two-tap confirm, same shape as the Workshop delete. Archive is a
  // tombstone, never a hard delete — a delete that cannot travel undoes
  // itself on the next sync.
  gearArmArchive(document.getElementById('gearReviewArchive'), g.id, () => {
    modal.close();
    renderGearSection();
  });

  modal.showModal();
}

function gearArmArchive(btn, id, done) {
  const T = Engine.t;
  btn.addEventListener('click', () => {
    if (btn.dataset.armed === '1') {
      const res = GearStore.archive(id);
      showToast(res.ok ? T('gearArchived')
        : res.error === 'version-skew' ? T('gearSkew') : T('gearSaveFailed'));
      if (done) done();
      return;
    }
    btn.dataset.armed = '1';
    btn.classList.add('is-armed');
    const orig = btn.textContent;
    btn.textContent = T('gearArchiveConfirm');
    setTimeout(() => {
      btn.dataset.armed = '';
      btn.classList.remove('is-armed');
      btn.textContent = orig;
    }, 3000);
  });
}

// ── All gears (D6/D8) — a list, never a builder ──────────────────────────────

function openGearAll() {
  if (!gearAvailable()) return;
  const T   = Engine.t;
  const idx = gearFilterIndex();
  const live = gearList();
  const activeId = gearActiveId(live);
  let archived = [];
  try { archived = GearStore.listArchived(); } catch (_) { archived = []; }

  document.getElementById('gearAllTitle').textContent = T('gearAllTitle');

  const rowHtml = (g, isArchived) => `
    <div class="gear-row">
      <div class="gear-row-text">
        <span class="gear-row-name">${escHtml(gearDisplayName(g))}</span>
        <span class="gear-row-meta">${escHtml(
          [gearHeadline(g, idx),
           Object.prototype.hasOwnProperty.call(g.fields || {}, 'printer')
             ? gearFieldDisplay(g, 'printer', idx).text : ''
          ].filter(Boolean).join(' · '))}</span>
      </div>
      <div class="gear-row-actions">
        ${!isArchived && g.id === activeId ? `<span class="gear-badge">${T('gearDefaultBadge')}</span>` : ''}
        ${isArchived
          ? `<button class="export-btn gear-row-restore" data-id="${escHtml(g.id)}">${T('gearRestore')}</button>`
          : `<button class="export-btn gear-row-open" data-id="${escHtml(g.id)}">${T('gearDetails')}</button>
             <button class="export-btn gear-row-generate" data-id="${escHtml(g.id)}"${
               g.invalid ? ' disabled title="' + escHtml(T('gearRunUnavailable')) + '"' : ''}>${T('gearGenerate')}</button>`}
      </div>
    </div>`;

  const body = document.getElementById('gearAllBody');
  body.innerHTML =
      `<div class="gear-row-list">` + live.map(g => rowHtml(g, false)).join('') + `</div>`
    + (archived.length
        ? `<div class="gear-pick-group-label">${T('gearArchivedTitle')}</div>`
          + `<div class="gear-row-list is-archived">` + archived.map(g => rowHtml(g, true)).join('') + `</div>`
        : '');

  const modal = document.getElementById('gearAllModal');
  body.querySelectorAll('.gear-row-open').forEach(b =>
    b.addEventListener('click', () => { modal.close(); openGearReview(b.dataset.id); }));
  body.querySelectorAll('.gear-row-generate:not([disabled])').forEach(b =>
    b.addEventListener('click', () => { modal.close(); applyGear(b.dataset.id, true); }));
  body.querySelectorAll('.gear-row-restore').forEach(b =>
    b.addEventListener('click', () => {
      const res = GearStore.restore(b.dataset.id);
      showToast(res.ok ? T('gearRestored')
        : res.error === 'version-skew' ? T('gearSkew') : T('gearSaveFailed'));
      modal.close();
      renderGearSection();
    }));

  modal.showModal();
}

// ── Derived ownership (D10) — never stored ───────────────────────────────────

function gearOwnedBrandIds() {
  if (!gearAvailable()) return [];
  try { return gearDerivedBrandIds(gearList(), id => Engine.getPrinter(id)) || []; }
  catch (_) { return []; }
}

function gearOwnedPrinterIds() {
  if (!gearAvailable()) return [];
  try { return gearDerivedPrinterIds(gearList()) || []; }
  catch (_) { return []; }
}

function gearGroupLabel(text) {
  const el = document.createElement('span');
  el.className = 'chips-group-label';
  el.textContent = text;
  return el;
}

// ── Boot (spec §3.3) ─────────────────────────────────────────────────────────

let _gearBootNotice = null;

// The THIRD boot branch: a share link wins, then a restored session, then the
// default gear. render() persists the applied state to `3dpa_state_v1`, so the
// next boot takes the 'storage' branch — deliberate. The gear SEEDS a fresh
// session; it never overrides the one the user left behind.
function applyBootGear() {
  if (!gearAvailable()) return false;
  const gears = gearList();
  if (!gears.length) return false;
  const activeId = gearActiveId(gears);
  const g = gears.filter(x => x.id === activeId)[0];
  if (!g) return false;

  const r = inspectGear(g, gearCatalogs(), gearMeta());
  applyGearToState(r.resolved, state, gearDeps());

  // Nothing usable survived validation — leave the app in its first-run state
  // rather than claiming a gear was loaded. Boot does NOT touch() the gear:
  // opening the app is not the user choosing it, and a read must never move a
  // clock the ordering depends on.
  if (!state.printer) {
    pickerBrand = null;
    pickerCollapsed = false;
    Engine.setActiveSlicer('bambu_studio');
    return false;
  }
  _gearBootNotice = (r.state === 'ok')
    ? Engine.t('gearBootNotice').replace('{name}', gearDisplayName(g))
    : gearApplyMessage(g, r);
  return true;
}

// ── Saving: one button, two outcomes ─────────────────────────────────────────

// Both paths need the same minimum, and it is the same minimum the results
// panel needs to exist at all: printer + nozzle + material.
function saveReady() {
  return !!(state.printer && state.nozzle && state.material);
}

function openSaveChooser() {
  if (!saveReady()) return;
  const T = Engine.t;
  document.getElementById('saveChooserTitle').textContent       = T('saveChooserTitle');
  document.getElementById('saveChooserIntro').textContent       = T('saveChooserIntro');
  document.getElementById('saveChoiceProfileTitle').textContent = T('saveChoiceProfileTitle');
  document.getElementById('saveChoiceProfileDesc').textContent  = T('saveChoiceProfileDesc');
  document.getElementById('saveChoiceGearTitle').textContent    = T('saveChoiceGearTitle');
  document.getElementById('saveChoiceGearDesc').textContent     = T('saveChoiceGearDesc');

  // Gear needs storage. If it is unavailable the menu would offer a dead
  // option, so the button goes straight to the profile save instead.
  const gearRow = document.getElementById('saveChoiceGear');
  if (!gearAvailable()) { startWorkshopSave(); return; }
  gearRow.style.display = '';
  document.getElementById('saveChooserModal').showModal();
}

function startWorkshopSave() {
  if (!saveReady() || !WorkshopStore) return;
  const p = Engine.getPrinter(state.printer);
  const m = Engine.getMaterial(state.material);
  const suggested = [m?.name, p?.name].filter(Boolean).join(' · ');
  openNameModal(Engine.t('saveProfileTitle'), suggested, name => {
    // Snapshot through the codec so only known state fields are stored.
    const snapshot = JSON.parse(StateCodec.encodeForStorage(state)).state;
    const r = WorkshopStore.save(name, snapshot);
    showToast(r.ok ? Engine.t('profileSaved') : Engine.t('wsSaveFailed'));
  });
}

// ── Wiring ───────────────────────────────────────────────────────────────────

function bindGearControls() {
  const saveModal = document.getElementById('gearSaveModal');
  document.getElementById('gearSaveClose').addEventListener('click', () => saveModal.close());
  saveModal.addEventListener('click', e => { if (e.target === saveModal) saveModal.close(); });
  document.getElementById('gearSaveConfirm').addEventListener('click', commitGearSave);
  document.getElementById('gearSaveName').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commitGearSave(); }
  });
  // Ticking a field changes WHICH gear this would duplicate, so a warning earned
  // against one field set must not license a different one.
  document.getElementById('gearSaveFields').addEventListener('change', () => {
    if (!_gearDupeArmed) return;
    _gearDupeArmed = false;
    document.getElementById('gearSaveConfirm').textContent = Engine.t('gearSaveConfirm');
  });

  const reviewModal = document.getElementById('gearReviewModal');
  document.getElementById('gearReviewClose').addEventListener('click', () => reviewModal.close());
  reviewModal.addEventListener('click', e => { if (e.target === reviewModal) reviewModal.close(); });

  const allModal = document.getElementById('gearAllModal');
  document.getElementById('gearAllClose').addEventListener('click', () => allModal.close());
  allModal.addEventListener('click', e => { if (e.target === allModal) allModal.close(); });

  document.getElementById('gearAllBtn').addEventListener('click', openGearAll);
  document.getElementById('gearAddBtn').addEventListener('click', armAddGear);
  document.getElementById('gearEmptyAddBtn').addEventListener('click', armAddGear);
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

  bindGearControls();

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

  document.getElementById('saveProfileBtn').addEventListener('click', openSaveChooser);

  // The chooser. One Save button, two outcomes, each with its own sentence —
  // "★ Save" and "◆ Save gear" sat adjacent and both began with "Save", which
  // told the user nothing about which was which (owner, 2026-08-21).
  const chooser = document.getElementById('saveChooserModal');
  document.getElementById('saveChooserClose').addEventListener('click', () => chooser.close());
  chooser.addEventListener('click', e => { if (e.target === chooser) chooser.close(); });
  document.getElementById('saveChoiceProfile').addEventListener('click', () => {
    chooser.close(); startWorkshopSave();
  });
  document.getElementById('saveChoiceGear').addEventListener('click', () => {
    chooser.close(); openGearSaveDialog();
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
    const dump = WorkshopStore.exportJSON();
    // null === version skew: the stored envelope is from a newer build and we
    // could not read it. Exporting anyway would hand the user a valid-looking
    // but empty backup.
    if (dump === null) { showToast(Engine.t('wsExportSkew')); return; }
    _downloadJSONText(dump, '3dpa-workshop-backup.json');
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

  function _nativeJSONExport() {
    const slicer = state.printer ? Engine.getSlicerForPrinter(state.printer) : null;
    if (slicer === 'bambu_studio') return { slicer, result: Engine.exportBambuStudioJSON(state) };
    if (slicer === 'orcaslicer')   return { slicer, result: Engine.exportOrcaJSON(state) };
    return { slicer, result: null };
  }

  // The Orca filename prefix is chosen by slicer, and Orca now covers far more
  // than the four Ender rows it launched with.

  function _nativeJSONFilename(kind, slicer) {
    const prefix = slicer === 'orcaslicer' ? 'orca_' : '';
    return `3DPA_${prefix}${kind}_${state.printer}_${state.material}.json`;
  }

  // Process export button
  document.getElementById('exportProcessBtn').addEventListener('click', () => {
    if (!state.printer || !state.nozzle || !state.material) return;
    const T = Engine.t;
    const btn = document.getElementById('exportProcessBtn');
    track('export_clicked', { type: 'process', printerModel: state.printer, nozzle: state.nozzle, material: state.material });
    const native = _nativeJSONExport();
    const result = native.result;
    if (result?.process) {
      _downloadJSON(result.process, _nativeJSONFilename('process', native.slicer));
      _flashBtn(btn, '↓ Done');
    }
  });

  // Filament export button
  document.getElementById('exportFilamentBtn').addEventListener('click', () => {
    if (!state.printer || !state.nozzle || !state.material) return;
    const T = Engine.t;
    const btn = document.getElementById('exportFilamentBtn');
    track('export_clicked', { type: 'filament', printerModel: state.printer, nozzle: state.nozzle, material: state.material });
    const native = _nativeJSONExport();
    const result = native.result;
    if (result?.filament) {
      _downloadJSON(result.filament, _nativeJSONFilename('filament', native.slicer));
      _flashBtn(btn, '↓ Done');
    }
  });

  // PrusaSlicer config-bundle export button
  document.getElementById('exportPrusaBtn').addEventListener('click', () => {
    if (!state.printer || !state.nozzle || !state.material) return;
    const btn = document.getElementById('exportPrusaBtn');
    const ini = Engine.exportPrusaINI(state);
    track('export_clicked', { type: 'prusa_ini', printerModel: state.printer, nozzle: state.nozzle, material: state.material });
    if (ini) {
      _downloadText(ini, `3DPA_prusa_${state.printer}_${state.material}.ini`, 'text/plain');
      _flashBtn(btn, '↓ Done');
    }
  });

  // Copy fallback for non-Bambu printers
  document.getElementById('exportCopyBtn').addEventListener('click', () => {
    if (!state.printer || !state.nozzle || !state.material) return;
    const T = Engine.t;
    const btn = document.getElementById('exportCopyBtn');
    track('export_clicked', { type: 'copy', printerModel: state.printer, nozzle: state.nozzle, material: state.material });
    const text = Engine.formatProfileAsText(state);
    if (text) {
      navigator.clipboard.writeText(text).then(() => _flashBtn(btn, T('exportCopied')));
    }
  });

  function _downloadJSON(obj, filename) {
    _downloadJSONText(JSON.stringify(obj, null, 2), filename);
  }

  function _downloadJSONText(text, filename) {
    _downloadText(text, filename, 'application/json');
  }

  function _downloadText(text, filename, mimeType) {
    const blob = new Blob([text], { type: mimeType });
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
  syncPersonalTuning();   // IMPL-044 W3 — before persist/resolve (mine-mode truth)
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
  const exportHint   = document.getElementById('exportHint');
  const processBtn = document.getElementById('exportProcessBtn');
  const filamentBtn = document.getElementById('exportFilamentBtn');
  const prusaBtn = document.getElementById('exportPrusaBtn');
  const hasMin = state.printer && state.nozzle && state.material;
  if (hasMin && state.printer) {
    // Engine owns the "can this actually produce importable files?" decision —
    // never re-derive it from the slicer id here (see getNativeExportSupport).
    const support = Engine.getNativeExportSupport(state);
    const slicer = support.slicer;
    if (support.available) {
      exportGroup.style.display  = 'flex';
      exportCopyBtn.style.display = 'none';
      // A missing filament preset is communicated in the hint, not only in a
      // `title` tooltip — tooltips do not exist on touch, which is most of the
      // traffic.
      const processOnlyNote = support.hasFilament
        ? ''
        : ' ' + T('exportHintProcessOnly').replace(/\{slicer\}/g, support.slicerName);
      if (support.format === 'ini') {
        processBtn.style.display = 'none';
        filamentBtn.style.display = 'none';
        prusaBtn.style.display = '';
        exportHint.textContent = T('exportHintPrusa') + processOnlyNote;
        exportHint.style.display = '';
      } else {
        processBtn.style.display = '';
        filamentBtn.style.display = '';
        prusaBtn.style.display = 'none';
        const isOrca = slicer === 'orcaslicer';
        processBtn.textContent = isOrca ? '↓ Orca Process' : '↓ Process';
        filamentBtn.textContent = isOrca ? '↓ Orca Filament' : '↓ Filament';
        processBtn.title = isOrca
          ? 'Download process profile (print settings) for OrcaSlicer'
          : 'Download process profile (print settings) for Bambu Studio';
        exportHint.textContent = T(isOrca ? 'exportHintOrca' : 'exportHintBambu') + processOnlyNote;
        exportHint.style.display = '';
        // Grey out filament button if no filament export available
        filamentBtn.disabled = !support.hasFilament;
        filamentBtn.title = support.hasFilament
          ? `Download filament profile (temperatures, cooling, PA) for ${isOrca ? 'OrcaSlicer' : 'Bambu Studio'}`
          : 'Filament export not available for this material/printer combination';
      }
    } else {
      // No vendor preset to inherit from. Copy still works for every printer —
      // say why the download buttons are missing instead of silently hiding
      // them, which reads as "export is broken".
      exportGroup.style.display  = 'none';
      exportCopyBtn.style.display = 'block';
      exportHint.textContent = T('exportHintCopyOnly')
        .replace(/\{slicer\}/g, support.slicerName || Engine.getSlicerDisplayName(slicer));
      exportHint.style.display = '';
    }
  } else {
    exportGroup.style.display  = 'none';
    exportCopyBtn.style.display = 'none';
    exportHint.style.display = 'none';
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
  if (hasMin) maybeOfferArmedGearSave();
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
    const temps = Engine.getAdjustedTemps(state.material, state.environment, state.nozzle, state.speed, state.printer, state.profileMode);
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
