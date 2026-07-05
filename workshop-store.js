// ─── 3D Print Assistant — Workshop store (IMPL-044 Phase W1) ─────────────────
// Saved-profiles shelf: versioned localStorage envelope at `3dpa_workshop_v1`.
// App-layer only — profiles hold opaque app-state objects (serialized shape
// owned by state-codec.js); id validation against catalogs happens at restore
// time in app.js via StateCodec.validateState.
//
// createWorkshopStore(storage) takes any localStorage-like object so Node
// tests can inject mocks and drive quota/corruption deterministically. The
// browser gets a ready instance bound to window.localStorage.
//
// The backup file format IS this envelope (`exportJSON`/`importJSON`) — iOS
// Workshop (gate I2) must stay byte-compatible with it.

function createWorkshopStore(storage) {

  const KEY = '3dpa_workshop_v1';
  const VERSION = 1;

  function _newId() {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    } catch (_) {}
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function _now() { return new Date().toISOString(); }

  function _read() {
    let raw = null;
    try { raw = storage.getItem(KEY); } catch (_) { return []; }
    if (!raw) return [];
    let env;
    try { env = JSON.parse(raw); } catch (_) { return []; }
    if (!env || typeof env !== 'object') return [];
    if (env.v !== VERSION) return [];
    if (!Array.isArray(env.profiles)) return [];
    return env.profiles.filter(p => p && typeof p === 'object' && p.id && p.state && typeof p.state === 'object');
  }

  function _write(profiles) {
    try {
      storage.setItem(KEY, JSON.stringify({ v: VERSION, profiles }));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e && e.name === 'QuotaExceededError') ? 'quota' : 'storage' };
    }
  }

  function list() { return _read(); }

  function get(id) { return _read().find(p => p.id === id) || null; }

  function save(name, state, notes) {
    const profiles = _read();
    const profile = {
      id: _newId(),
      name: String(name || '').trim() || 'Untitled',
      state: state,
      notes: typeof notes === 'string' ? notes : '',
      created: _now(),
      updated: _now(),
    };
    const w = _write([...profiles, profile]);
    return w.ok ? { ok: true, profile } : w;
  }

  function rename(id, newName) {
    const profiles = _read();
    const p = profiles.find(x => x.id === id);
    if (!p) return { ok: false, error: 'not-found' };
    p.name = String(newName || '').trim() || p.name;
    p.updated = _now();
    return _write(profiles);
  }

  function remove(id) {
    const profiles = _read();
    const next = profiles.filter(x => x.id !== id);
    if (next.length === profiles.length) return { ok: false, error: 'not-found' };
    return _write(next);
  }

  function exportJSON() {
    return JSON.stringify({ v: VERSION, profiles: _read() }, null, 2);
  }

  // Import merges: existing profiles are kept, imported entries win on id
  // collision. Restoring a backup can never destroy local-only profiles.
  function importJSON(json) {
    let env;
    try { env = JSON.parse(json); } catch (_) { return { ok: false, error: 'parse' }; }
    if (!env || typeof env !== 'object' || env.v !== VERSION || !Array.isArray(env.profiles)) {
      return { ok: false, error: 'format' };
    }
    const incoming = env.profiles.filter(p =>
      p && typeof p === 'object' && p.id && p.state && typeof p.state === 'object');
    const byId = new Map();
    _read().forEach(p => byId.set(p.id, p));
    incoming.forEach(p => byId.set(p.id, p));
    const w = _write([...byId.values()]);
    return w.ok ? { ok: true, count: incoming.length } : w;
  }

  return { list, get, save, rename, remove, exportJSON, importJSON };
}

const WorkshopStore = (typeof localStorage !== 'undefined')
  ? createWorkshopStore(localStorage)
  : null;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createWorkshopStore };
}
