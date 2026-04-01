// ─── 3D Print Assistant — App (UI only) ──────────────────────────────────────
// No business logic here. All logic lives in engine.js.
// When the API is built, engine.js moves server-side and app.js changes URLs only.

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  printer: null, nozzle: null, material: null,
  useCase: [], surface: null, strength: null, speed: null,
  environment: null, support: null, colors: null,
  userLevel: null, special: [],
};

let currentMode       = 'simple';        // 'simple' | 'advanced'
let currentTheme      = 'dark';          // 'dark' | 'light'
let activeTabId       = 'quality';       // persisted across re-renders
let currentView       = 'configure';     // 'configure' | 'troubleshoot' | 'purge'
let activeSymptom     = null;            // troubleshooter selected symptom id
let comparisonProfile = null;            // { profile, label } when Profile A is locked

// Print time estimator state
const ptState = { height: 50, width: 50, depth: 50, walls: 3, infill: 15 };

// Purge calculator state
const purgeState = {
  slotCount: 4,
  slots: [
    { name: 'Color 1', brightness: 'dark'   },
    { name: 'Color 2', brightness: 'light'  },
    { name: 'Color 3', brightness: 'medium' },
    { name: 'Color 4', brightness: 'light'  },
  ],
};

// ── Modal content (About + Disclaimer) ───────────────────────────────────────
const MODAL_CONTENT = {
  about: {
    en: {
      title: 'About 3D Print Assistant',
      body: `<p>3D Print Assistant was built by an amateur 3D printing enthusiast who couldn't find a simple, structured tool for getting started with print settings — so decided to build one. It translates your printer, nozzle, material, and print goals into optimized starting settings for your slicer.</p>
             <p>The tool is currently optimized for <strong>Bambu Studio</strong>, matching the structure of its Filament and Process tabs so you can apply settings directly without hunting for where things live. Support for more slicers is planned.</p>
             <p>Settings are built from a hybrid of community knowledge, hands-on experience, and manufacturer defaults — a database that is still learning and being refined. This is a <strong>beta project</strong>. All recommendations are a starting point for your own experimentation, not a guarantee.</p>`,
    },
    da: {
      title: 'Om 3D Print Assistant',
      body: `<p>3D Print Assistant er bygget af en amatør 3D-print-entusiast, der ikke kunne finde et simpelt, struktureret værktøj til at komme i gang med printindstillinger — og derfor besluttede at bygge et. Det oversætter din printer, dyse, materiale og printmål til optimerede startindstillinger til din slicer.</p>
             <p>Værktøjet er i øjeblikket optimeret til <strong>Bambu Studio</strong> og matcher strukturen i dets Filament- og Process-faner, så du kan anvende indstillinger direkte uden at lede efter, hvor tingene befinder sig. Support til flere slicers er planlagt.</p>
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

function openModal(key) {
  const lang    = Engine.getLang();
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
  document.getElementById('navPurge').textContent          = T('navPurge');

  // Lang toggle active state
  document.getElementById('langEN').classList.toggle('active', lang === 'en');
  document.getElementById('langDA').classList.toggle('active', lang === 'da');

  // Empty state
  document.getElementById('emptyTitle').textContent = T('emptyTitle');
  document.getElementById('emptySub').textContent   = T('emptySub');

  // Heroes
  document.getElementById('troubleHeroTitle').textContent = T('troubleTitle');
  document.getElementById('troubleHeroSub').textContent   = T('troubleSub');
  document.getElementById('purgeHeroTitle').textContent   = T('purgeTitle');
  document.getElementById('purgeHeroSub').textContent     = T('purgeSub');

  // Panel headers
  document.getElementById('panelFilTitle').textContent  = T('panelFilTitle');
  document.getElementById('panelFilSub').textContent    = T('panelFilSub');
  document.getElementById('panelProfTitle').textContent = T('panelProfTitle');
  document.getElementById('panelProfSub').textContent   = T('panelProfSub');

  // Buttons that live in the header area
  document.getElementById('exportBtn').textContent     = T('exportBtn');
  const lockBtn = document.getElementById('compareLockBtn');
  if (lockBtn) lockBtn.textContent = comparisonProfile ? T('compareClear') : T('compareBtn');

  // Footer
  const footerEl = document.getElementById('footerText');
  footerEl.innerHTML = `${T('footer')} &middot; <button class="about-link" id="aboutBtn">${T('aboutLink')}</button> &middot; <button class="about-link" id="disclaimerFooterBtn">${T('disclaimerLink')}</button>`;
  document.getElementById('aboutBtn').addEventListener('click', () => openModal('about'));
  document.getElementById('disclaimerFooterBtn').addEventListener('click', () => openModal('disclaimer'));

  // Rebuild filters with translated labels + re-sync selections
  buildFilters();
  Engine.FILTERS.forEach(filter => {
    const val      = state[filter.key];
    const selected = Array.isArray(val) ? val : (val ? [val] : []);
    document.querySelectorAll(`#chips_${filter.key} .chip`).forEach(chip => {
      chip.classList.toggle('selected', selected.includes(chip.dataset.value));
    });
  });

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
  if (currentView === 'purge') renderPurgeCalculator();
}

// ── Build filter sections from Engine.FILTERS ─────────────────────────────────
function buildFilters() {
  const filtersContainer = document.getElementById('filtersContainer');
  filtersContainer.innerHTML = '';
  const isMobile = window.innerWidth <= 768;

  Engine.FILTERS.forEach(filter => {
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
    filter.items.forEach(item => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.dataset.value = item.id;
      chip.innerHTML = `<span>${item.name}</span>${item.desc ? `<span class="chip-desc">${item.desc}</span>` : ''}`;
      chip.addEventListener('click', () => handleChipClick(chipsEl, chip, filter.key, item.id, filter.multi));
      chipsEl.appendChild(chip);
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
  document.getElementById('viewPurge').style.display         = view === 'purge'         ? '' : 'none';
  document.getElementById('navConfigure').classList.toggle('active',    view === 'configure');
  document.getElementById('navTroubleshoot').classList.toggle('active',  view === 'troubleshoot');
  document.getElementById('navPurge').classList.toggle('active',         view === 'purge');
  if (view === 'purge') renderPurgeCalculator();
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

// ── AMS Purge Calculator ──────────────────────────────────────────────────────
function renderPurgeCalculator() {
  const T   = Engine.t;
  const el  = document.getElementById('purgeCalculator');
  const mat = state.material ? Engine.getMaterial(state.material) : null;
  const grp = mat?.group || 'PLA';

  // Sync slot count
  while (purgeState.slots.length < purgeState.slotCount)
    purgeState.slots.push({ name: `Color ${purgeState.slots.length + 1}`, brightness: 'medium' });
  purgeState.slots.length = purgeState.slotCount;

  const { matrix, mult, tip } = Engine.calcPurgeVolumes(purgeState.slots, grp);

  const cellClass = v => v === 0 ? 'cell-same' : v < 120 ? 'cell-low' : v < 220 ? 'cell-mid' : v < 320 ? 'cell-high' : 'cell-crit';

  const matNote = mat
    ? `<span class="purge-mat-note">${T('purgeUsing')} <strong>${mat.name}</strong> (${mult}× ${T('purgeMultLabel')})</span>`
    : `<span class="purge-mat-note dimmed">${T('purgeMatNote')}</span>`;

  el.innerHTML = `
    <div class="purge-controls">
      <div class="purge-control-group">
        <span class="purge-label">${T('purgeSlots')}</span>
        <div class="purge-slot-btns">
          ${[2,4,8].map(n => `
            <button class="purge-slot-btn ${purgeState.slotCount === n ? 'active' : ''}"
              onclick="setPurgeSlotCount(${n})">${n}</button>`).join('')}
        </div>
      </div>
      <div>${matNote}</div>
    </div>

    <div class="purge-slots">
      ${purgeState.slots.map((s, i) => `
        <div class="purge-slot-card">
          <div class="purge-slot-num">${i + 1}</div>
          <input class="purge-slot-name" type="text" value="${escHtml(s.name)}"
            oninput="updateSlotName(${i}, this.value)" maxlength="14"/>
          <div class="purge-brightness-btns">
            ${['dark','medium','light'].map(b => `
              <button class="purge-bright-btn ${s.brightness === b ? 'active' : ''}"
                onclick="updateSlotBrightness(${i}, '${b}')">${b}</button>`).join('')}
          </div>
        </div>`).join('')}
    </div>

    ${tip ? `<div class="purge-tip">💡 ${tip}</div>` : ''}

    <div class="purge-matrix-wrap">
      <div class="purge-matrix-label">${T('purgeMatLabel')}</div>
      <div class="purge-matrix-scroll">
        <table class="purge-matrix">
          <thead>
            <tr>
              <th class="purge-th-corner">${T('purgeFromTo')}</th>
              ${purgeState.slots.map((s,i) => `<th class="purge-th">${escHtml(s.name || String(i+1))}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${matrix.map((row, i) => `
              <tr>
                <th class="purge-row-label">${escHtml(purgeState.slots[i].name || String(i+1))}</th>
                ${row.map((v, j) => `
                  <td class="purge-cell ${cellClass(v)}">
                    ${v === 0 ? '—' : v}
                  </td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="purge-legend">
        <span class="legend-item cell-low">${T('purgeLow')}</span>
        <span class="legend-item cell-mid">${T('purgeMid')}</span>
        <span class="legend-item cell-high">${T('purgeHigh')}</span>
        <span class="legend-item cell-crit">${T('purgeCrit')}</span>
        <span class="legend-unit">${T('purgeUnit')}</span>
      </div>
    </div>`;
}

function setPurgeSlotCount(n) {
  purgeState.slotCount = n;
  renderPurgeCalculator();
}
function updateSlotName(i, val) {
  purgeState.slots[i].name = val;
  // Re-render only the matrix headers (avoid losing focus on input)
  const ths = document.querySelectorAll('.purge-th');
  ths.forEach((th, idx) => { th.textContent = purgeState.slots[idx]?.name || idx + 1; });
  const rowLabels = document.querySelectorAll('.purge-row-label');
  rowLabels.forEach((td, idx) => { td.textContent = purgeState.slots[idx]?.name || idx + 1; });
}
function updateSlotBrightness(i, brightness) {
  purgeState.slots[i].brightness = brightness;
  renderPurgeCalculator();
}

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
  document.getElementById('navPurge').addEventListener('click',         () => setView('purge'));

  document.getElementById('exportBtn').addEventListener('click', () => {
    const data = Engine.exportProfile(state);
    if (!data) return;
    const printer  = state.printer  || 'printer';
    const material = state.material || 'material';
    const ts       = new Date().toISOString().slice(0, 10);
    const filename = `3DPrintAssistant_${printer}_${material}_${ts}.json`;
    const blob     = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);

    // Brief flash confirmation
    const btn = document.getElementById('exportBtn');
    const orig = btn.textContent;
    btn.textContent = Engine.t('exportSaved');
    btn.style.color = 'var(--green)';
    setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 1800);
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

  document.getElementById('resetBtn').addEventListener('click', () => {
    Object.keys(state).forEach(k => { state[k] = Array.isArray(state[k]) ? [] : null; });
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    comparisonProfile = null;
    updateCollapseBadges();
    render();
  });
}

// ── Mode toggle ───────────────────────────────────────────────────────────────
function setMode(mode) {
  currentMode = mode;
  document.getElementById('modeSimple').classList.toggle('active',   mode === 'simple');
  document.getElementById('modeAdvanced').classList.toggle('active', mode === 'advanced');
  render();
}

// ── Chip interaction ──────────────────────────────────────────────────────────
function handleChipClick(container, clicked, key, value, isMulti) {
  if (isMulti) {
    const was = clicked.classList.contains('selected');
    clicked.classList.toggle('selected', !was);
    state[key] = was ? state[key].filter(v => v !== value) : [...state[key], value];
  } else {
    const was = clicked.classList.contains('selected');
    container.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    clicked.classList.toggle('selected', !was);
    state[key] = was ? null : value;
  }
  render();
}

// ── Main render ───────────────────────────────────────────────────────────────
function render() {
  updateCollapseBadges();
  const hasMin = state.printer && state.nozzle && state.material;
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
    .map(m => `<div class="warning-item"><span class="warn-icon">⚠</span><span>${m}</span></div>`)
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
  const temps = Engine.getAdjustedTemps(state.material, state.environment, state.nozzle);
  const mvs   = filament.max_mvs[nozzle.size] || '—';
  const adv   = currentMode === 'advanced' ? Engine.getAdvancedFilamentSettings(state) : null;

  let html = '';

  if (adv) {
    html += `
      <div class="setting-section-label">${T('secNozzleTemp')}</div>
      ${row(T('rowInitLayer'),   adv.initial_layer_temp,     'val-temp')}
      ${row(T('rowOtherLayers'), adv.other_layers_temp,      'val-temp')}
      <div class="setting-section-label">${T('secBedTemp')}</div>
      ${row(T('rowInitLayer'),   adv.initial_layer_bed_temp, 'val-temp')}
      ${row(T('rowOtherLayers'), adv.other_layers_bed_temp,  'val-temp')}`;
  } else {
    html += `
      <div class="setting-section-label">${T('secTemps')}</div>
      ${row(T('rowNozzleTemp'), temps.nozzle, 'val-temp')}
      ${row(T('rowBedTemp'),    temps.bed,    'val-temp')}`;
  }

  html += `
    <div class="setting-section-label">${T('secCooling')}</div>
    ${row(T('rowCoolingFan'), filament.cooling_fan)}`;

  if (adv) {
    html += `
      ${row(T('rowFanMin'),      adv.cooling_fan_min)}
      ${row(T('rowFanOverhang'), adv.cooling_fan_overhang)}
      ${row(T('rowSlowLayer'),   adv.slow_layer_time)}`;
  }

  html += `
    <div class="setting-section-label">${T('secSpeedLimit')}</div>
    ${row(T('rowMVS'), mvs, 'val-info')}
    <div class="setting-section-label">${T('secSetup')}</div>
    ${row(T('rowBuildPlate'), filament.build_plate)}
    ${row(T('rowAMS'),        filament.ams ? T('valYes') : T('valNo'), filament.ams ? 'val-ok' : 'val-no')}
    ${row(T('rowDrying'),     filament.drying)}
    ${row(T('rowEnclosure'),  filament.enclosure)}`;

  if (adv) {
    html += `
      <div class="setting-section-label adv-label">${T('secAdvExtrusion')}</div>
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

    return `<div class="tab-content${tab.id === activeTabId ? ' active' : ''}" data-tab="${tab.id}">${body}</div>`;
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
