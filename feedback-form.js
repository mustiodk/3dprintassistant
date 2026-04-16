// ─── 3D Print Assistant — Feedback Modal (UI only) ───────────────────────────
// Native <dialog>-based feedback form. POSTs to /api/feedback (Cloudflare Pages
// Function) which forwards to Discord. Webhook URL never reaches the client.
//
// Public surface (attached to window.FeedbackForm):
//   FeedbackForm.open(prefillCategory?)  — opens the modal
//   FeedbackForm.close()                 — closes it
//   FeedbackForm.refreshLang()           — re-render strings after language switch
//
// No business logic here — mirrors the app.js convention.

(function () {
  'use strict';

  // ── Category config — must match iOS FeedbackCategory.swift taxonomy ────────
  // Field ids map to entries that become Discord embed fields server-side.
  const CATEGORIES = {
    generalFeedback: {
      titleKey: 'fbCatGeneralFeedback',
      fields: [
        { id: 'message', labelKey: 'fbFieldMessage', type: 'textarea', required: true, maxLength: 2000 },
      ],
    },
    featureRequest: {
      titleKey: 'fbCatFeatureRequest',
      fields: [
        { id: 'message', labelKey: 'fbFieldMessage', type: 'textarea', required: true, maxLength: 2000 },
      ],
    },
    bugReport: {
      titleKey: 'fbCatBugReport',
      fields: [
        { id: 'steps',   labelKey: 'fbFieldSteps',   type: 'textarea', required: true,  maxLength: 2000 },
        { id: 'context', labelKey: 'fbFieldContext', type: 'textarea', required: false, maxLength: 1000 },
      ],
    },
    missingPrinter: {
      titleKey: 'fbCatMissingPrinter',
      fields: [
        { id: 'brand', labelKey: 'fbFieldBrand', type: 'text',     required: true,  maxLength: 80 },
        { id: 'model', labelKey: 'fbFieldModel', type: 'text',     required: true,  maxLength: 80 },
        { id: 'notes', labelKey: 'fbFieldNotes', type: 'textarea', required: false, maxLength: 1000 },
      ],
    },
    missingFilament: {
      titleKey: 'fbCatMissingFilament',
      fields: [
        { id: 'material', labelKey: 'fbFieldMaterial', type: 'text',     required: true,  maxLength: 80 },
        { id: 'brand',    labelKey: 'fbFieldBrand',    type: 'text',     required: false, maxLength: 80 },
        { id: 'notes',    labelKey: 'fbFieldNotes',    type: 'textarea', required: false, maxLength: 1000 },
      ],
    },
    missingNozzle: {
      titleKey: 'fbCatMissingNozzle',
      fields: [
        { id: 'spec',  labelKey: 'fbFieldNozzleSpec', type: 'text',     required: true,  maxLength: 80 },
        { id: 'notes', labelKey: 'fbFieldNotes',      type: 'textarea', required: false, maxLength: 1000 },
      ],
    },
    missingSlicer: {
      titleKey: 'fbCatMissingSlicer',
      fields: [
        { id: 'slicer', labelKey: 'fbFieldSlicerName', type: 'text',     required: true,  maxLength: 80 },
        { id: 'notes',  labelKey: 'fbFieldNotes',      type: 'textarea', required: false, maxLength: 1000 },
      ],
    },
  };

  const CATEGORY_ORDER = [
    'generalFeedback',
    'featureRequest',
    'bugReport',
    'missingPrinter',
    'missingFilament',
    'missingNozzle',
    'missingSlicer',
  ];

  // ── State ────────────────────────────────────────────────────────────────────
  let dialog = null;
  let currentCategory = 'generalFeedback';
  let status = 'idle'; // 'idle' | 'submitting' | 'success' | 'error'
  let errorMsg = '';

  // ── Translation helper — safely fall back if key missing ────────────────────
  // Engine is a top-level `const` declared in engine.js. In classic scripts,
  // top-level `const` does NOT attach to `window`, but is visible by name
  // within the same script scope and from other classic scripts loaded in
  // the same document. Access by bare name (matches app.js convention).
  function T(key) {
    try {
      if (typeof Engine !== 'undefined' && typeof Engine.t === 'function') {
        const s = Engine.t(key);
        if (typeof s === 'string' && s.length) return s;
      }
    } catch (_) {}
    return key;
  }

  // ── Browser / OS detection — best-effort, cosmetic for Discord footer ────────
  function detectBrowser() {
    const ua = navigator.userAgent || '';
    const pairs = [
      { re: /Edg\/(\d+\.\d+)/,      name: 'Edge' },
      { re: /OPR\/(\d+\.\d+)/,      name: 'Opera' },
      { re: /Firefox\/(\d+\.\d+)/,  name: 'Firefox' },
      { re: /Chrome\/(\d+\.\d+)/,   name: 'Chrome' },
      { re: /Version\/(\d+\.\d+).*Safari/, name: 'Safari' },
    ];
    for (const p of pairs) {
      const m = ua.match(p.re);
      if (m) return { name: p.name, version: m[1] };
    }
    return { name: 'Unknown', version: '' };
  }

  function detectOS() {
    const ua = navigator.userAgent || '';
    const p = navigator.platform || '';
    if (/iPhone|iPad|iPod/.test(ua))  return 'iOS';
    if (/Android/.test(ua))           return 'Android';
    if (/Mac/.test(p))                return 'macOS';
    if (/Win/.test(p))                return 'Windows';
    if (/Linux/.test(p))              return 'Linux';
    return 'Unknown';
  }

  function buildContext(honeypotValue) {
    const meta = document.querySelector('meta[name="app-version"]');
    const b = detectBrowser();
    return {
      appVersion:     (meta && meta.content) || '',
      browser:        b.name,
      browserVersion: b.version,
      os:             detectOS(),
      locale:         navigator.language || '',
      screen:         `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio || 1}x`,
      honeypot:       honeypotValue || '',
    };
  }

  // ── DOM builders ─────────────────────────────────────────────────────────────
  function ensureDialog() {
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'feedbackModal';
    dialog.className = 'info-modal feedback-modal';
    dialog.innerHTML = `
      <div class="modal-inner">
        <div class="modal-header">
          <span class="modal-title" data-fb-el="title"></span>
          <button class="modal-close" data-fb-el="close" aria-label="Close">&#x2715;</button>
        </div>
        <form class="feedback-form" data-fb-el="form" novalidate>
          <label class="feedback-label">
            <span data-fb-el="categoryLabel"></span>
            <select class="feedback-select" data-fb-el="category"></select>
          </label>
          <div class="feedback-fields" data-fb-el="fields"></div>
          <label class="feedback-label">
            <span data-fb-el="emailLabel"></span>
            <input type="email" class="feedback-input" data-fb-el="email" autocomplete="email" />
          </label>
          <!-- honeypot: invisible to humans, tempting to bots -->
          <div class="feedback-honeypot" aria-hidden="true">
            <label>Do not fill this field
              <input type="text" name="website" tabindex="-1" autocomplete="off" data-fb-el="honeypot" />
            </label>
          </div>
          <div class="feedback-error" data-fb-el="error" role="alert" hidden></div>
          <div class="feedback-actions">
            <button type="button" class="feedback-btn feedback-btn--ghost"  data-fb-el="cancel"></button>
            <button type="submit" class="feedback-btn feedback-btn--primary" data-fb-el="submit"></button>
          </div>
          <div class="feedback-success" data-fb-el="success" hidden>
            <div class="feedback-success-icon">\u2713</div>
            <div class="feedback-success-title"  data-fb-el="successTitle"></div>
            <div class="feedback-success-sub"    data-fb-el="successSub"></div>
            <button type="button" class="feedback-btn feedback-btn--primary" data-fb-el="successClose"></button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(dialog);

    // Wire events (one-time)
    qs('close').addEventListener('click', closeDialog);
    qs('cancel').addEventListener('click', closeDialog);
    qs('successClose').addEventListener('click', closeDialog);
    dialog.addEventListener('cancel', (evt) => { evt.preventDefault(); closeDialog(); });
    dialog.addEventListener('click', (evt) => {
      // Click on backdrop (the dialog itself, not its children) closes
      if (evt.target === dialog) closeDialog();
    });

    qs('category').addEventListener('change', (evt) => {
      currentCategory = evt.target.value;
      renderFields();
    });

    qs('form').addEventListener('submit', onSubmit);

    return dialog;
  }

  function qs(name, root) {
    return (root || dialog).querySelector(`[data-fb-el="${name}"]`);
  }

  function renderAll() {
    qs('title').textContent         = T('fbModalTitle');
    qs('categoryLabel').textContent = T('fbCategoryLabel');
    qs('emailLabel').textContent    = T('fbEmailLabel');
    qs('email').placeholder         = T('fbEmailPlaceholder');
    qs('cancel').textContent        = T('fbCancel');
    qs('successTitle').textContent  = T('fbSuccessTitle');
    qs('successSub').textContent    = T('fbSuccessSub');
    qs('successClose').textContent  = T('fbClose');
    renderSubmitButton();
    renderCategoryDropdown();
    renderFields();
  }

  function renderCategoryDropdown() {
    const select = qs('category');
    select.innerHTML = '';
    for (const key of CATEGORY_ORDER) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = T(CATEGORIES[key].titleKey);
      if (key === currentCategory) opt.selected = true;
      select.appendChild(opt);
    }
  }

  function renderFields() {
    const wrap = qs('fields');
    wrap.innerHTML = '';
    const cat = CATEGORIES[currentCategory];
    if (!cat) return;

    for (const f of cat.fields) {
      const label = document.createElement('label');
      label.className = 'feedback-label';

      const span = document.createElement('span');
      span.textContent = T(f.labelKey) + (f.required ? ' *' : '');
      label.appendChild(span);

      let input;
      if (f.type === 'textarea') {
        input = document.createElement('textarea');
        input.className = 'feedback-textarea';
        input.rows = 4;
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'feedback-input';
      }
      input.name = f.id;
      input.maxLength = f.maxLength;
      input.dataset.fbField = f.id;
      input.dataset.fbLabel = T(f.labelKey);
      if (f.required) input.dataset.fbRequired = '1';
      label.appendChild(input);

      wrap.appendChild(label);
    }
  }

  function renderSubmitButton() {
    const btn = qs('submit');
    btn.disabled = status === 'submitting';
    btn.textContent = status === 'submitting' ? T('fbSubmitting') : T('fbSubmit');
  }

  function showError(msg) {
    errorMsg = msg || '';
    const el = qs('error');
    el.textContent = errorMsg;
    el.hidden = !errorMsg;
  }

  // ── Open / close ─────────────────────────────────────────────────────────────
  function openDialog(prefillCategory) {
    ensureDialog();
    if (prefillCategory && CATEGORIES[prefillCategory]) {
      currentCategory = prefillCategory;
    }
    status = 'idle';
    qs('form').reset();
    // Reset form visibility (hide success; show all form sections EXCEPT error,
    // which stays hidden until there's a message to show).
    qs('success').hidden = true;
    qs('form').querySelectorAll('.feedback-label, .feedback-fields, .feedback-actions, .feedback-honeypot').forEach(el => el.hidden = false);
    showError('');
    renderAll();
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    // Focus first visible field
    const first = qs('fields').querySelector('input, textarea');
    if (first) first.focus();
  }

  function closeDialog() {
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function onSubmit(evt) {
    evt.preventDefault();
    if (status === 'submitting') return;

    const cat = CATEGORIES[currentCategory];
    if (!cat) return;

    // Collect fields + validate
    const fields = [];
    for (const f of cat.fields) {
      const el = qs('form').querySelector(`[data-fb-field="${f.id}"]`);
      const value = (el && typeof el.value === 'string') ? el.value.trim() : '';
      if (f.required && !value) {
        showError(T('fbErrRequired').replace('{field}', T(f.labelKey)));
        if (el) el.focus();
        return;
      }
      if (value) {
        fields.push({ label: T(f.labelKey), value });
      }
    }
    if (fields.length === 0) {
      showError(T('fbErrRequired').replace('{field}', T('fbFieldMessage')));
      return;
    }

    const email = (qs('email').value || '').trim();
    const honeypot = (qs('honeypot').value || '').trim();

    const body = {
      category: currentCategory,
      fields,
      email: email || null,
      context: buildContext(honeypot),
    };

    status = 'submitting';
    showError('');
    renderSubmitButton();

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        // same-origin default — no credentials needed
      });

      let data = null;
      try { data = await res.json(); } catch (_) { data = null; }

      if (res.ok && data && data.ok) {
        status = 'success';
        showSuccess();
        try { window.track && window.track('feedback_submitted', { category: currentCategory }); } catch (_) {}
        return;
      }

      status = 'error';
      const code = (data && data.error) || `http_${res.status}`;
      showError(errorMessageFor(code));
    } catch (err) {
      status = 'error';
      showError(errorMessageFor('network'));
    } finally {
      renderSubmitButton();
    }
  }

  function showSuccess() {
    qs('form').querySelectorAll('.feedback-label, .feedback-fields, .feedback-actions, .feedback-error, .feedback-honeypot').forEach(el => el.hidden = true);
    qs('success').hidden = false;
  }

  function errorMessageFor(code) {
    // Friendly fallbacks. Unknown codes fall to a generic message.
    switch (code) {
      case 'webhook_not_configured': return T('fbErrNotConfigured');
      case 'discord_unreachable':    return T('fbErrNetwork');
      case 'network':                return T('fbErrNetwork');
      case 'invalid_category':       return T('fbErrInvalidCategory');
      case 'no_fields':
      case 'no_field_values':        return T('fbErrRequired').replace('{field}', T('fbFieldMessage'));
      case 'payload_too_large':      return T('fbErrTooLarge');
      case 'forbidden_origin':       return T('fbErrGeneric');
      default:                       return T('fbErrGeneric');
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  window.FeedbackForm = {
    open: openDialog,
    close: closeDialog,
    refreshLang: function () {
      if (!dialog || !dialog.open) return;
      renderAll();
    },
  };
})();
