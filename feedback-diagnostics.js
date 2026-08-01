(function (root) {
  'use strict';

  const EVENTS = new Set(['app_opened', 'page_opened', 'screen_opened', 'printer_selected', 'material_selected', 'nozzle_selected', 'profile_generated', 'output_opened', 'export_started', 'export_succeeded', 'export_failed', 'copy_started', 'copy_succeeded', 'copy_failed', 'catalog_initialized', 'catalog_failed', 'feedback_opened']);
  const PROPS = new Set(['printer', 'material', 'nozzle', 'operation', 'outputMode', 'slicer', 'status', 'feature']);
  const FEATURES = new Set(['app', 'configure', 'troubleshoot', 'workshop', 'feedback', 'output', 'catalog', 'unknown']);
  const OPERATIONS = new Set(['process', 'filament', 'prusa_ini', 'copy', 'bundle', 'orca_bundle', 'prusa_bundle', 'profile', 'catalog', 'feedback']);
  const OUTPUT_MODES = new Set(['simple', 'advanced', 'text', 'bambu', 'orca', 'prusa']);
  const STATUSES = new Set(['started', 'succeeded', 'failed', 'available', 'unavailable']);
  const STABLE_ID = /^[a-z0-9][a-z0-9._-]{0,79}$/;
  const STORAGE_KEY = '3dpa_physical_printer_v1';
  // Must stay identical to FEEDBACK_CAPTURE_REASONS / FEEDBACK_ENTRY_POINTS in
  // functions/api/_lib/feedback-contract.js — scripts/feedback-diagnostics.test.mjs
  // asserts the parity, because the server rejects anything outside these sets.
  const CAPTURE_REASONS = new Set(['manual', 'form_opened', 'export_failed', 'copy_failed', 'engine_failed', 'catalog_failed']);
  const ENTRY_POINTS = new Set(['feedback.card', 'feedback.modal', 'output.export_error', 'output.copy_error', 'app.engine_error', 'app.catalog_error']);

  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function channel(host) {
    if (host === '3dprintassistant.com' || host === 'www.3dprintassistant.com') return 'production';
    if (host === '' || host === 'localhost' || host === '127.0.0.1') return 'local';
    return 'preview';
  }
  function coarseBrowser(navigatorLike) {
    const brands = navigatorLike?.userAgentData?.brands || [];
    const brand = brands.find((item) => !/not.?a.?brand/i.test(item.brand || ''));
    if (brand) {
      const family = /edge/i.test(brand.brand) ? 'edge'
        : /chrom/i.test(brand.brand) ? 'chrome'
          : /firefox/i.test(brand.brand) ? 'firefox'
            : /safari/i.test(brand.brand) ? 'safari' : 'other';
      return { browserFamily: family, browserVersion: String(brand.version || '').split('.')[0] };
    }
    const ua = String(navigatorLike?.userAgent || '');
    const candidates = [
      ['edge', /Edg\/([\d.]+)/], ['opera', /OPR\/([\d.]+)/],
      ['firefox', /Firefox\/([\d.]+)/], ['chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
      ['safari', /Version\/([\d.]+).*Safari/],
    ];
    for (const [browserFamily, pattern] of candidates) {
      const match = ua.match(pattern);
      if (match) return { browserFamily, browserVersion: match[1].split('.')[0] };
    }
    return { browserFamily: 'other', browserVersion: '' };
  }
  function coarsePlatform(navigatorLike) {
    const ua = String(navigatorLike?.userAgent || '');
    let match = ua.match(/Android\s+([\d.]+)/i);
    if (match) return { osFamily: 'android', osVersion: match[1], deviceClass: /mobile/i.test(ua) ? 'mobile' : 'tablet' };
    match = ua.match(/(?:iPhone|CPU(?: iPhone)? OS)\s*([\d_]+)/i);
    if (match) return { osFamily: /iPad/i.test(ua) ? 'ipados' : 'ios', osVersion: match[1].replaceAll('_', '.'), deviceClass: /iPad/i.test(ua) ? 'tablet' : 'mobile' };
    match = ua.match(/Mac OS X\s+([\d_]+)/i);
    if (match) return { osFamily: 'macos', osVersion: match[1].replaceAll('_', '.'), deviceClass: 'desktop' };
    match = ua.match(/Windows NT\s+([\d.]+)/i);
    if (match) return { osFamily: 'windows', osVersion: match[1], deviceClass: 'desktop' };
    match = ua.match(/CrOS\s+\S+\s+([\d.]+)/i);
    if (match) return { osFamily: 'chromeos', osVersion: match[1], deviceClass: 'desktop' };
    return { osFamily: /Linux/i.test(ua) ? 'linux' : 'other', osVersion: '', deviceClass: navigatorLike?.userAgentData?.mobile ? 'mobile' : 'desktop' };
  }
  function coarseScreenClass() {
    const width = Number(root.innerWidth || root.screen?.width || 0);
    if (width <= 0) return 'unknown';
    if (width < 600) return 'compact';
    if (width < 1024) return 'medium';
    return 'large';
  }
  function application() {
    const release = root.__3DPA_RELEASE__ || {};
    const browser = coarseBrowser(root.navigator);
    const platform = coarsePlatform(root.navigator);
    return {
      platform: 'web', releaseChannel: channel(root.location?.hostname || ''),
      appVersion: release.appVersion || '', releaseId: release.releaseId || '',
      engineRevision: release.assetFingerprint || release.releaseId || '',
      locale: root.navigator?.language || '', screenClass: coarseScreenClass(),
      ...browser, ...platform,
    };
  }
  // Web ships one bundled catalog and has no remote overlay — that is the iOS
  // PrinterCatalogProvider's job — so the honest answer is the bundled revision,
  // not an empty field and not an invented overlay content version.
  function catalogProvenance() {
    const release = root.__3DPA_RELEASE__ || {};
    return { baselineRevision: release.catalogRevision || '', overlaySource: 'bundled' };
  }
  function allowedProp(key, value) {
    if (typeof value !== 'string') return false;
    if (['printer', 'material', 'nozzle', 'slicer'].includes(key)) return STABLE_ID.test(value);
    if (key === 'feature') return FEATURES.has(value);
    if (key === 'operation') return OPERATIONS.has(value);
    if (key === 'outputMode') return OUTPUT_MODES.has(value);
    if (key === 'status') return STATUSES.has(value);
    return false;
  }
  function safePreference(includeCustomText) {
    try {
      const parsed = JSON.parse(root.localStorage.getItem(STORAGE_KEY) || 'null');
      if (parsed?.kind === 'supported' && typeof parsed.printerId === 'string') return { kind: 'supported', printerId: parsed.printerId, match: 'unknown' };
      // The user told us their printer differs from the selected profile but named no
      // catalog printer, so there is no canonical id to report. "supported" would claim one.
      if (parsed?.kind === 'different') return { kind: 'unknown', match: 'different' };
      if (parsed?.kind === 'custom') return { kind: 'custom', match: 'custom_not_in_catalog', ...(includeCustomText ? { customPrinterBrand: String(parsed.customPrinterBrand || '').slice(0, 100), customPrinterModel: String(parsed.customPrinterModel || '').slice(0, 160) } : {}) };
    } catch (_) {}
    return { kind: 'unknown', match: 'unknown' };
  }

  function createRecorder(options) {
    const now = options?.now || (() => Date.now());
    const breadcrumbs = [];
    let provider = () => ({});
    let frozenFailure = null;
    return {
      record(name, props) {
        if (!EVENTS.has(name)) return false;
        const clean = {};
        for (const [key, value] of Object.entries(props || {})) {
          const normalized = typeof value === 'string' ? value : String(value);
          if (PROPS.has(key) && allowedProp(key, normalized)) clean[key] = normalized;
        }
        breadcrumbs.push({ name, at: now(), screen: clean.feature || 'unknown', props: clean });
        if (breadcrumbs.length > 25) breadcrumbs.shift();
        return true;
      },
      setSnapshotProvider(fn) { provider = typeof fn === 'function' ? fn : () => ({}); },
      freezeFailure(failure, reason, entryPoint) {
        frozenFailure = this.snapshot(reason, entryPoint, false, failure);
        return clone(frozenFailure);
      },
      snapshot(reason, entryPoint, useFrozen, failure) {
        if (useFrozen && frozenFailure) return clone(frozenFailure);
        const captured = now();
        const supplied = clone(provider()) || {};
        return {
          // Degrade an unknown call site to a safe in-vocabulary value: the server
          // rejects anything else outright, which would lose the whole report.
          capturedAt: new Date(captured).toISOString(),
          captureReason: CAPTURE_REASONS.has(reason) ? reason : 'manual',
          entryPoint: ENTRY_POINTS.has(entryPoint) ? entryPoint : 'feedback.card',
          application: application(),
          physicalPrinter: supplied.physicalPrinter || safePreference(false), configuration: supplied.configuration || {},
          catalog: { ...catalogProvenance(), ...(supplied.catalog || {}) },
          runtime: { online: root.navigator?.onLine !== false, ...(supplied.runtime || {}) },
          failure: clone(failure || supplied.failure || {}),
          // The server requires an integer age; any non-integer clock would make the
          // whole report fail validation at the boundary instead of just this crumb.
          breadcrumbs: breadcrumbs.map((item) => ({ name: item.name, ageMs: Math.round(Math.max(0, captured - item.at)), screen: item.screen, props: clone(item.props) })),
        };
      },
    };
  }

  const recorder = createRecorder();
  root.FeedbackDiagnostics = {
    createRecorder,
    record: recorder.record.bind(recorder),
    freezeFailure: recorder.freezeFailure.bind(recorder),
    setSnapshotProvider: recorder.setSnapshotProvider.bind(recorder),
    snapshot: recorder.snapshot.bind(recorder),
    physicalPrinterPreference: () => safePreference(true),
    savePhysicalPrinterPreference(value) {
      try { root.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); return true; } catch (_) { return false; }
    },
    buildSubmission(category, userContent, diagnostics) {
      const safeDiagnostics = clone(diagnostics) || {};
      safeDiagnostics.application = { ...application(), ...(safeDiagnostics.application || {}) };
      if (safeDiagnostics.physicalPrinter?.kind === 'custom') {
        safeDiagnostics.physicalPrinter = { kind: 'custom', match: 'custom_not_in_catalog' };
      }
      if (category !== 'bugReport') {
        delete safeDiagnostics.physicalPrinter;
        delete safeDiagnostics.configuration;
        delete safeDiagnostics.catalog;
        delete safeDiagnostics.runtime;
        delete safeDiagnostics.failure;
        delete safeDiagnostics.breadcrumbs;
      }
      return { schemaVersion: 'feedback_v2', category, userContent: clone(userContent) || {}, diagnostics: safeDiagnostics };
    },
  };
})(globalThis);
