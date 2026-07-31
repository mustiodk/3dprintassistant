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
