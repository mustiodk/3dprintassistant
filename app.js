// ─── 3D Print Assistant — App (UI only) ──────────────────────────────────────
// No business logic here. All logic lives in engine.js.
// When the API is built, engine.js moves server-side and app.js changes URLs only.

// ── Analytics ─────────────────────────────────────────────────────────────────
function track(name, props) {
  try {
    if (localStorage.getItem('3dpa_notrack') === '1') return;
    window.cfBeacon?.pushEvent?.(name, props || {});
  } catch (_) {}
}

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  printer: null, nozzle: null, material: null,
  useCase: [], surface: null, strength: null, speed: null,
  environment: null, support: null, colors: null,
  userLevel: null, special: [],
  seam: null, brim: null, build_plate: null,
  extruder_type: null, filament_condition: null, ironing: null,
};

let currentMode       = 'simple';        // 'simple' | 'advanced'
const expandedSections = new Set();      // tracks which filters have been expanded via "+N more"
let currentTheme      = 'dark';          // 'dark' | 'light'
let activeTabId       = 'quality';       // persisted across re-renders
let currentView       = 'configure';     // 'configure' | 'troubleshoot' | 'feedback' | 'beta'
let activeSymptom     = null;            // troubleshooter selected symptom id
let comparisonProfile = null;            // { profile, label } when Profile A is locked
let _lastTrackedCombo = null;            // deduplicates profile_generated events
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
             <p>The tool supports <strong>64 printers</strong> across 12 brands — including Bambu Lab, Creality, Prusa, Anycubic, QIDI, Voron, and more — with slicer-specific output for <strong>Bambu Studio</strong>, <strong>OrcaSlicer</strong>, and <strong>PrusaSlicer</strong>. Settings match the structure of your slicer's tabs so you can apply them directly.</p>
             <p>Settings are built from a hybrid of community knowledge, hands-on experience, and manufacturer defaults — a database that is still learning and being refined. This is a <strong>beta project</strong>. All recommendations are a starting point for your own experimentation, not a guarantee.</p>`,
    },
    da: {
      title: 'Om 3D Print Assistant',
      body: `<p>3D Print Assistant er bygget af en amatør 3D-print-entusiast, der ikke kunne finde et simpelt, struktureret værktøj til at komme i gang med printindstillinger — og derfor besluttede at bygge et. Det oversætter din printer, dyse, materiale og printmål til optimerede startindstillinger til din slicer.</p>
             <p>Værktøjet understøtter <strong>64 printere</strong> fra 12 mærker — inkl. Bambu Lab, Creality, Prusa, Anycubic, QIDI, Voron m.fl. — med slicer-specifikt output til <strong>Bambu Studio</strong>, <strong>OrcaSlicer</strong> og <strong>PrusaSlicer</strong>. Indstillingerne matcher strukturen i din slicers faner, så du kan anvende dem direkte.</p>
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
    bindControls();
    applyLang();
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
  document.getElementById('navFeedback').textContent       = T('navFeedback');
  document.getElementById('navBeta').textContent           = T('navBeta');

  // Lang toggle active state
  document.getElementById('langEN').classList.toggle('active', lang === 'en');
  document.getElementById('langDA').classList.toggle('active', lang === 'da');

  // Empty state
  document.getElementById('emptyTitle').textContent = T('emptyTitle');
  document.getElementById('emptySub').textContent   = T('emptySub');

  // Heroes
  document.getElementById('troubleHeroTitle').textContent   = T('troubleTitle');
  document.getElementById('troubleHeroSub').textContent     = T('troubleSub');
  document.getElementById('betaHeroTitle').textContent          = T('betaHeroTitle');
  document.getElementById('betaHeroSub').textContent            = T('betaHeroSub');
  document.getElementById('betaCardTitle').textContent          = T('betaCardTitle');
  document.getElementById('betaCardDesc').textContent           = T('betaCardDesc');
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

  if (!state.printer) {
    el.classList.remove('visible');
    return;
  }

  const p = Engine.getPrinter(state.printer);
  if (!p) { el.classList.remove('visible'); return; }

  const brand = Engine.getBrands().find(b => b.id === p.manufacturer);
  txt.innerHTML = `${brand ? brand.name : p.manufacturer} <span class="crumb">\u203A</span> ${p.name}`;
  el.classList.add('visible');
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

// ── Build filter sections from Engine.FILTERS ─────────────────────────────────
function buildFilters() {
  const filtersContainer = document.getElementById('filtersContainer');
  filtersContainer.innerHTML = '';
  const isMobile = window.innerWidth <= 768;

  Engine.FILTERS.forEach(filter => {
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
  Engine.FILTERS.forEach(filter => {
    const val      = state[filter.key];
    const selected = Array.isArray(val) ? val : (val ? [val] : []);
    document.querySelectorAll(`#chips_${filter.key} .chip`).forEach(chip => {
      chip.classList.toggle('selected', selected.includes(chip.dataset.value));
    });
  });
}

// ── Update selected-count badge on collapsed filter labels ───────────────────
function updateCollapseBadges() {
  Engine.FILTERS.forEach(filter => {
    const labelEl = document.querySelector(`#chips_${filter.key}`)
      ?.closest('.filter-section')
      ?.querySelector('.filter-section-label');
    if (!labelEl) return;
    const val = state[filter.key];
    const count = Array.isArray(val) ? val.length : (val ? 1 : 0);
    labelEl.dataset.count = count > 0 ? String(count) : '';
  });
}

// ── Top-level view switching (Configure / Troubleshoot) ──────────────────────
function setView(view) {
  currentView = view;
  document.getElementById('viewConfigure').style.display    = view === 'configure'    ? '' : 'none';
  document.getElementById('viewTroubleshoot').style.display  = view === 'troubleshoot'  ? '' : 'none';
  document.getElementById('viewFeedback').style.display      = view === 'feedback'      ? '' : 'none';
  document.getElementById('viewBeta').style.display          = view === 'beta'          ? '' : 'none';
  document.getElementById('navConfigure').classList.toggle('active',    view === 'configure');
  document.getElementById('navTroubleshoot').classList.toggle('active',  view === 'troubleshoot');
  document.getElementById('navFeedback').classList.toggle('active',      view === 'feedback');
  document.getElementById('navBeta').classList.toggle('active',          view === 'beta');
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
  document.getElementById('navFeedback').addEventListener('click',      () => setView('feedback'));
  document.getElementById('navBeta').addEventListener('click',          () => setView('beta'));

  // Feedback modal — any .feedback-card[data-feedback-category] opens it
  document.querySelectorAll('.feedback-card[data-feedback-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.feedbackCategory;
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
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
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

  document.getElementById('resetBtn').addEventListener('click', () => {
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
  });
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
  updateCollapseBadges();
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
    const combo = `${state.printer}|${state.nozzle}|${state.material}`;
    if (combo !== _lastTrackedCombo) {
      _lastTrackedCombo = combo;
      track('profile_generated', { printer: state.printer, nozzle: state.nozzle, material: state.material });
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
function renderWarnings(warnings) {
  document.getElementById('warningsBar').innerHTML = warnings
    .map(m => {
      const body = m.detail ? `<strong>${m.text}</strong> ${m.detail}` : m.text;
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

  if (advTemps) {
    // Nozzle temperature — always show initial + other (or collapsed if equal)
    html += `<div class="setting-section-label">${FS('secNozzleTemp')}</div>`;
    if (nozzleSame) {
      html += row(T('rowNozzleTemp'), advTemps.initial_layer_temp + ' — both layers', 'val-temp');
    } else {
      html += row(T('rowInitLayer'),   advTemps.initial_layer_temp,  'val-temp');
      html += row(T('rowOtherLayers'), advTemps.other_layers_temp,   'val-temp');
    }
    // Bed temperature — always show initial + other (or collapsed if equal)
    html += `<div class="setting-section-label">${FS('secBedTemp')}</div>`;
    if (bedSame) {
      html += row(T('rowBedTemp'), advTemps.initial_layer_bed_temp + ' — both layers', 'val-temp');
    } else {
      html += row(T('rowInitLayer'),   advTemps.initial_layer_bed_temp, 'val-temp');
      html += row(T('rowOtherLayers'), advTemps.other_layers_bed_temp,  'val-temp');
    }
  } else {
    // Fallback (no material data)
    const temps = Engine.getAdjustedTemps(state.material, state.environment, state.nozzle, state.speed);
    html += `<div class="setting-section-label">${FS('secTemps')}</div>`;
    html += row(T('rowNozzleTemp'), temps.nozzle, 'val-temp');
    html += row(T('rowBedTemp'),    temps.bed,    'val-temp');
  }

  html += `
    <div class="setting-section-label">${FS('secCooling')}</div>
    ${row(T('rowCoolingFan'), filament.cooling_fan)}`;

  if (adv) {
    html += `
      ${row(T('rowFanMin'),      adv.cooling_fan_min)}
      ${row(T('rowFanOverhang'), adv.cooling_fan_overhang)}
      ${row(T('rowSlowLayer'),   adv.slow_layer_time)}`;
  }

  html += `
    <div class="setting-section-label">${FS('secSpeedLimit')}</div>
    ${row(T('rowMVS'), mvs, 'val-info')}
    <div class="setting-section-label">${T('secSetup')}</div>
    ${row(T('rowBuildPlate'), filament.build_plate)}
    ${row(T('rowAMS'),        filament.ams ? T('valYes') : T('valNo'), filament.ams ? 'val-ok' : 'val-no')}
    ${row(T('rowDrying'),     filament.drying)}
    ${row(T('rowEnclosure'),  filament.enclosure)}`;

  if (adv) {
    html += `
      <div class="setting-section-label adv-label">${FS('secAdvExtrusion')}</div>
      ${row(T('rowPA'),          adv.pressure_advance, 'val-info')}
      ${row(T('rowFlow'),        adv.flow_ratio,        'val-info')}
      ${row(T('rowRetractLen'),  adv.retraction_length)}
      ${row(T('rowRetractSpd'),  adv.retraction_speed)}`;
  }

  if (filament.notes.length) {
    html += `<div class="filament-notes">${filament.notes.map(n => `<div class="filament-note">${n}</div>`).join('')}</div>`;
  }

  document.getElementById('filamentSettings').innerHTML = html;
}

const row = (label, value, cls) =>
  `<div class="setting-row">
     <span class="setting-name">${label}</span>
     <span class="setting-value${cls ? ' ' + cls : ''}">${value}</span>
   </div>`;

// ── Profile Panel ─────────────────────────────────────────────────────────────
function renderProfilePanel(profile) {
  const nav      = document.getElementById('profileTabNav');
  const contents = document.getElementById('profileTabContents');
  const banner   = document.getElementById('compareBanner');

  const T = Engine.t;

  // Render comparison banner
  if (comparisonProfile) {
    banner.innerHTML = `
      <div class="compare-banner">
        <span>${T('compareLocked')} <strong>${comparisonProfile.label}</strong></span>
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
        return `
          <div class="setting-row comparing">
            <span class="setting-name">${Engine.PARAM_LABELS[p]}</span>
            <span class="setting-value val-cmp-a ${aCls}">${aVal}</span>
            <span class="setting-value val-cmp-b ${bCls}">${bVal}</span>
          </div>
          ${item?.why ? `<div class="setting-why">${item.why}</div>` : ''}`;
      }

      return `
        <div class="setting-row">
          <span class="setting-name">${Engine.PARAM_LABELS[p]}</span>
          <span class="setting-value val-ok">${item.value}</span>
        </div>
        ${item.why ? `<div class="setting-why">${item.why}</div>` : ''}`;
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
