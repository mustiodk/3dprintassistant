// ─── 3D Print Assistant — State codec (IMPL-042 Phases A+B) ──────────────────
// App-layer serializer for the app-state object: localStorage persistence,
// shareable URL params, and (IMPL-044) Workshop profile storage all encode
// through this one module. UI-free and engine-free by design: validation takes
// the Engine as an argument and only uses its public catalog API.
//
// This is app code, not engine code — it manipulates the app-state object only
// and never reaches into engine internals.
//
// Loaded by index.html before app.js (browser: window.StateCodec) and
// require()-able from Node test scripts (module.exports).

const StateCodec = (() => {

  const STORAGE_VERSION = 1;

  // Single source of truth for every state field the codec knows about.
  // Adding a field to the app-state object (app.js) requires a row here —
  // the round-trip test in scripts/state-codec.test.js pins this contract.
  //   key:  state object property
  //   url:  short stable query-param key (spec IMPL-042 §Phase B)
  //   kind: 'single' (string id or null) | 'multi' (array of ids)
  const FIELDS = [
    { key: 'printer',            url: 'p',  kind: 'single' },
    { key: 'material',           url: 'm',  kind: 'single' },
    { key: 'nozzle',             url: 'n',  kind: 'single' },
    { key: 'useCase',            url: 'uc', kind: 'multi'  },
    { key: 'surface',            url: 'sq', kind: 'single' },
    { key: 'strength',           url: 'st', kind: 'single' },
    { key: 'speed',              url: 'sp', kind: 'single' },
    { key: 'environment',        url: 'e',  kind: 'single' },
    { key: 'support',            url: 'su', kind: 'single' },
    { key: 'colors',             url: 'c',  kind: 'single' },
    { key: 'userLevel',          url: 'u',  kind: 'single' },
    { key: 'profileMode',        url: 'pm', kind: 'single' },
    { key: 'special',            url: 'x',  kind: 'multi'  },
    { key: 'seam',               url: 'se', kind: 'single' },
    { key: 'brim',               url: 'b',  kind: 'single' },
    { key: 'build_plate',        url: 'bp', kind: 'single' },
    { key: 'extruder_type',      url: 'et', kind: 'single' },
    { key: 'filament_condition', url: 'fc', kind: 'single' },
    { key: 'ironing',            url: 'i',  kind: 'single' },
  ];

  function defaultState() {
    const s = {};
    FIELDS.forEach(f => { s[f.key] = f.kind === 'multi' ? [] : null; });
    return s;
  }

  // ── Storage (localStorage `3dpa_state_v1`) ─────────────────────────────────

  function encodeForStorage(state) {
    const out = {};
    FIELDS.forEach(f => {
      const v = state[f.key];
      if (f.kind === 'multi') {
        if (Array.isArray(v) && v.length) out[f.key] = v;
      } else if (v != null) {
        out[f.key] = v;
      }
    });
    return JSON.stringify({ v: STORAGE_VERSION, state: out });
  }

  function decodeFromStorage(json) {
    let env;
    try { env = JSON.parse(json); } catch (_) { return null; }
    if (!env || typeof env !== 'object') return null;
    if (env.v !== STORAGE_VERSION) return null;
    if (!env.state || typeof env.state !== 'object') return null;
    return env.state;
  }

  // ── URL query params (share links, `history.replaceState`) ─────────────────

  function encodeToParams(state) {
    const parts = [];
    FIELDS.forEach(f => {
      const v = state[f.key];
      if (f.kind === 'multi') {
        if (Array.isArray(v) && v.length) parts.push(`${f.url}=${v.map(encodeURIComponent).join(',')}`);
      } else if (v != null && v !== '') {
        parts.push(`${f.url}=${encodeURIComponent(v)}`);
      }
    });
    return parts.join('&');
  }

  // [IMPL-044 W3 / Codex mine-tier review HIGH-1] The SHARE affordance's
  // encoder: personal offsets never ride shared URLs (spec §5.3), so a shared
  // 'mine' state is substituted with 'safe' at the SENDER side — the URL
  // resolves identically for everyone who opens it. Deliberately NOT part of
  // encodeToParams: the live address bar uses that, URL restore wins over
  // storage on refresh, and mapping there silently reverted a Mine selection
  // to Safe on every reload.
  function encodeForShare(state) {
    return state && state.profileMode === 'mine'
      ? encodeToParams({ ...state, profileMode: 'safe' })
      : encodeToParams(state);
  }

  function decodeFromParams(search) {
    const out = {};
    let params;
    try { params = new URLSearchParams(search || ''); } catch (_) { return out; }
    FIELDS.forEach(f => {
      const raw = params.get(f.url);
      if (raw == null || raw === '') return;
      if (f.kind === 'multi') {
        const vals = raw.split(',').map(s => s.trim()).filter(Boolean);
        if (vals.length) out[f.key] = vals;
      } else {
        out[f.key] = raw;
      }
    });
    return out;
  }

  // ── Validation — every id checked against the live catalogs ────────────────
  // Unknown ids (retired printers, typos, hostile URLs) degrade to the field
  // default. Never throws, never half-restores: output always has every field.

  function validateState(raw, engine) {
    const clean = defaultState();
    if (!raw || typeof raw !== 'object') return clean;

    // getFilters(state) is the id source for goal/environment/advanced fields;
    // called with the default (all-null) state, matching app boot behavior.
    const validIds = {};
    engine.getFilters(defaultState()).forEach(f => {
      validIds[f.key] = new Set((f.items || []).map(i => i.id));
    });

    FIELDS.forEach(f => {
      const v = raw[f.key];
      if (f.kind === 'multi') {
        if (!Array.isArray(v)) return;
        const ids = validIds[f.key];
        clean[f.key] = ids ? v.filter(id => ids.has(id)) : [];
        return;
      }
      if (typeof v !== 'string' || v === '') return;
      let ok = false;
      if (f.key === 'printer')       ok = !!engine.getPrinter(v);
      else if (f.key === 'material') ok = !!engine.getMaterial(v);
      else if (f.key === 'nozzle')   ok = !!engine.getNozzle(v);
      // [IMPL-044 W3] 'mine' is structurally valid even though getFilters only
      // offers it conditionally (per-pair tuning): storage restores must keep
      // it. The app's per-render sync degrades mine → safe when no tuning
      // exists for the restored pair, and the engine resolves byte-equal safe.
      else if (f.key === 'profileMode' && v === 'mine') ok = true;
      else                           ok = !!(validIds[f.key] && validIds[f.key].has(v));
      if (ok) clean[f.key] = v;
    });

    return clean;
  }

  return {
    FIELDS,
    defaultState,
    encodeForStorage,
    decodeFromStorage,
    encodeToParams,
    encodeForShare,
    decodeFromParams,
    validateState,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateCodec;
}
