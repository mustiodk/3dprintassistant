(function (root) {
  'use strict';

  const EVENTS = new Set(['app_opened', 'page_opened', 'screen_opened', 'printer_selected', 'material_selected', 'nozzle_selected', 'profile_generated', 'output_opened', 'export_started', 'export_succeeded', 'export_failed', 'copy_started', 'copy_succeeded', 'copy_failed', 'catalog_initialized', 'catalog_failed', 'feedback_opened']);
  const PROPS = new Set(['printer', 'material', 'nozzle', 'operation', 'outputMode', 'slicer', 'status', 'feature']);
  const STORAGE_KEY = '3dpa_physical_printer_v1';

  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function channel(host) {
    if (host === '3dprintassistant.com' || host === 'www.3dprintassistant.com') return 'production';
    if (host === '' || host === 'localhost' || host === '127.0.0.1') return 'local';
    return 'preview';
  }
  function application() {
    const release = root.__3DPA_RELEASE__ || {};
    return {
      platform: 'web', releaseChannel: channel(root.location?.hostname || ''),
      appVersion: release.appVersion || '', releaseId: release.releaseId || '',
      locale: root.navigator?.language || '', browserFamily: 'web',
    };
  }
  function safePreference(includeCustomText) {
    try {
      const parsed = JSON.parse(root.localStorage.getItem(STORAGE_KEY) || 'null');
      if (parsed?.kind === 'supported' && typeof parsed.printerId === 'string') return { kind: 'supported', printerId: parsed.printerId, match: 'unknown' };
      if (parsed?.kind === 'different') return { kind: 'supported', match: 'different' };
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
          if (PROPS.has(key) && ['string', 'number', 'boolean'].includes(typeof value)) clean[key] = String(value).slice(0, 120);
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
          capturedAt: new Date(captured).toISOString(), captureReason: String(reason || 'manual').slice(0, 80),
          entryPoint: String(entryPoint || 'feedback').slice(0, 120), application: application(),
          physicalPrinter: supplied.physicalPrinter || safePreference(false), configuration: supplied.configuration || {},
          catalog: supplied.catalog || {}, runtime: { online: root.navigator?.onLine !== false, ...(supplied.runtime || {}) },
          failure: clone(failure || supplied.failure || {}),
          breadcrumbs: breadcrumbs.map((item) => ({ name: item.name, ageMs: Math.max(0, captured - item.at), screen: item.screen, props: clone(item.props) })),
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
      return { schemaVersion: 'feedback_v2', category, userContent: clone(userContent) || {}, diagnostics: safeDiagnostics };
    },
  };
})(globalThis);
