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

  // Envelope-level read/write (IMPL-044 W3 gate B3). _readEnv returns the whole
  // envelope so additive sections (tuning) survive profile writes; W1-era
  // envelopes (no tuning) parse unchanged.
  function _readEnv() {
    let raw = null;
    try { raw = storage.getItem(KEY); } catch (_) { return { v: VERSION, profiles: [] }; }
    if (!raw) return { v: VERSION, profiles: [] };
    let env;
    try { env = JSON.parse(raw); } catch (_) { return { v: VERSION, profiles: [] }; }
    if (!env || typeof env !== 'object' || env.v !== VERSION) return { v: VERSION, profiles: [] };
    if (!Array.isArray(env.profiles)) env.profiles = [];
    return env;
  }

  function _writeEnv(env) {
    try {
      storage.setItem(KEY, JSON.stringify(env));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e && e.name === 'QuotaExceededError') ? 'quota' : 'storage' };
    }
  }

  function _write(profiles) {
    const env = _readEnv();
    env.profiles = profiles;
    return _writeEnv(env);
  }

  // ── Tuning ledger (IMPL-044 W3 gate B3) — op-log accepts + dismissals ──────
  // Spec: docs/specs/IMPL-044-W3W4-mine-tier-and-custom-filaments.md §3.6.
  // The op log is the source of truth; `value` is a derived, clamped cache.
  function _tuningOf(env) {
    const t = (env.tuning && typeof env.tuning === 'object') ? env.tuning : {};
    return {
      accepted: Array.isArray(t.accepted) ? t.accepted : [],
      dismissed: Array.isArray(t.dismissed) ? t.dismissed : [],
    };
  }

  function getTuning() { return _tuningOf(_readEnv()); }

  function _clampSum(ops, clampMin, clampMax) {
    const sum = ops.reduce((a, o) => a + (Number(o.step) || 0), 0);
    return Math.min(clampMax, Math.max(clampMin, Math.round(sum * 100) / 100));
  }

  function addTuningOp(pairKey, offsetKey, unit, op) {
    const env = _readEnv();
    const tuning = _tuningOf(env);
    let entry = tuning.accepted.find(e => e.pairKey === pairKey && e.offsetKey === offsetKey);
    if (!entry) {
      // Accept ops always carry clamps (the harvest only offers clamped
      // suggestions); a revert-first cannot happen (nothing to revert).
      entry = { pairKey, offsetKey, unit, value: 0,
                clampMin: op.clampMin != null ? op.clampMin : 0,
                clampMax: op.clampMax != null ? op.clampMax : 0,
                ops: [] };
      tuning.accepted.push(entry);
    }
    if (op.clampMin != null) entry.clampMin = op.clampMin;
    if (op.clampMax != null) entry.clampMax = op.clampMax;
    // Clamp defense: reject accepts whose raw sum would pass the clamp, so the
    // raw sum can never outrun a revert.
    if (op.kind !== 'revert') {
      const rawSum = entry.ops.reduce((a, o) => a + (Number(o.step) || 0), 0);
      const next = rawSum + (Number(op.step) || 0);
      if (next < entry.clampMin || next > entry.clampMax) return { ok: false, error: 'clamp' };
    }
    entry.ops.push({
      opId: _newId(),
      kind: op.kind === 'revert' ? 'revert' : 'accept',
      step: Number(op.step) || 0,
      ...(op.symptomId ? { symptomId: op.symptomId } : {}),
      date: _now(),
    });
    entry.value = _clampSum(entry.ops, entry.clampMin, entry.clampMax);
    env.tuning = tuning;
    const w = _writeEnv(env);
    return w.ok ? { ok: true, entry } : w;
  }

  function revertTuning(pairKey, offsetKey) {
    const env = _readEnv();
    const tuning = _tuningOf(env);
    const entry = tuning.accepted.find(e => e.pairKey === pairKey && e.offsetKey === offsetKey);
    if (!entry) return { ok: false, error: 'not-found' };
    const rawSum = entry.ops.reduce((a, o) => a + (Number(o.step) || 0), 0);
    entry.ops.push({ opId: _newId(), kind: 'revert', step: -rawSum, date: _now() });
    entry.value = _clampSum(entry.ops, entry.clampMin, entry.clampMax);
    env.tuning = tuning;
    const w = _writeEnv(env);
    return w.ok ? { ok: true, entry } : w;
  }

  function dismissSuggestion(key) {
    const env = _readEnv();
    const tuning = _tuningOf(env);
    const existing = tuning.dismissed.find(d => d.key === key);
    if (existing) existing.date = _now();
    else tuning.dismissed.push({ key, date: _now() });
    env.tuning = tuning;
    return _writeEnv(env);
  }

  function getDismissal(key) {
    return getTuning().dismissed.find(d => d.key === key) || null;
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

  // ── Print journal (IMPL-044 W2) — per-profile outcome records ─────────────
  // Symptom tags reuse data/rules/troubleshooter.json symptom ids; the store
  // treats them as opaque strings (UI supplies/validates them via the engine).
  function addOutcome(profileId, outcome) {
    const profiles = _read();
    const p = profiles.find(x => x.id === profileId);
    if (!p) return { ok: false, error: 'not-found' };
    const rec = {
      id: _newId(),
      result: (outcome && outcome.result === 'failed') ? 'failed' : 'worked',
      symptoms: (outcome && Array.isArray(outcome.symptoms))
        ? outcome.symptoms.filter(s => typeof s === 'string')
        : [],
      note: (outcome && typeof outcome.note === 'string') ? outcome.note.slice(0, 500) : '',
      date: _now(),
    };
    if (!Array.isArray(p.journal)) p.journal = [];
    p.journal.push(rec);
    p.updated = _now();
    const w = _write(profiles);
    return w.ok ? { ok: true, outcome: rec } : w;
  }

  function removeOutcome(profileId, outcomeId) {
    const profiles = _read();
    const p = profiles.find(x => x.id === profileId);
    if (!p || !Array.isArray(p.journal)) return { ok: false, error: 'not-found' };
    const next = p.journal.filter(o => o.id !== outcomeId);
    if (next.length === p.journal.length) return { ok: false, error: 'not-found' };
    p.journal = next;
    p.updated = _now();
    return _write(profiles);
  }

  // exportJSON() → full backup (all profiles + global tuning).
  // exportJSON([ids]) → selected profiles only; tuning is global and stays out
  // of partial exports. Both shapes import through importJSON unchanged.
  function exportJSON(ids) {
    const all = _read();
    const partial = Array.isArray(ids);
    const out = { v: VERSION, profiles: partial ? all.filter(p => ids.includes(p.id)) : all };
    if (!partial) {
      const t = getTuning();
      if (t.accepted.length || t.dismissed.length) out.tuning = t;
    }
    return JSON.stringify(out, null, 2);
  }

  // Import merges: existing profiles are kept, imported entries win on id
  // collision; tuning merges by op-union (fork-lossless, idempotent).
  // ATOMIC: everything is merged in memory first, then ONE write — a quota
  // failure leaves storage untouched.
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

    // Merge tuning (op-union by opId) into a copy of current tuning — no writes yet.
    const cur = _tuningOf(_readEnv());
    const incTuning = (env.tuning && typeof env.tuning === 'object') ? env.tuning : {};
    (Array.isArray(incTuning.accepted) ? incTuning.accepted : []).forEach(inc => {
      if (!inc || !inc.pairKey || !inc.offsetKey || !Array.isArray(inc.ops)) return;
      let entry = cur.accepted.find(e => e.pairKey === inc.pairKey && e.offsetKey === inc.offsetKey);
      if (!entry) {
        entry = { pairKey: inc.pairKey, offsetKey: inc.offsetKey, unit: inc.unit,
                  value: 0, clampMin: inc.clampMin, clampMax: inc.clampMax, ops: [] };
        cur.accepted.push(entry);
      }
      const seen = new Set(entry.ops.map(o => o.opId));
      inc.ops.forEach(o => { if (o && o.opId && !seen.has(o.opId)) { entry.ops.push(o); seen.add(o.opId); } });
      entry.ops.sort((a, b) => String(a.date).localeCompare(String(b.date)));
      entry.value = _clampSum(entry.ops, entry.clampMin, entry.clampMax);
    });
    (Array.isArray(incTuning.dismissed) ? incTuning.dismissed : []).forEach(inc => {
      if (!inc || !inc.key) return;
      const ex = cur.dismissed.find(d => d.key === inc.key);
      if (!ex) cur.dismissed.push({ key: inc.key, date: inc.date || _now() });
      else if (String(inc.date) > String(ex.date)) ex.date = inc.date;
    });

    const out = _readEnv();
    out.profiles = [...byId.values()];
    if (cur.accepted.length || cur.dismissed.length) out.tuning = cur;
    const w = _writeEnv(out);                       // SINGLE write — atomic
    return w.ok ? { ok: true, count: incoming.length } : w;
  }

  return { list, get, save, rename, remove, addOutcome, removeOutcome, exportJSON, importJSON,
           getTuning, addTuningOp, revertTuning, dismissSuggestion, getDismissal };
}

const WorkshopStore = (typeof localStorage !== 'undefined')
  ? createWorkshopStore(localStorage)
  : null;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createWorkshopStore };
}
