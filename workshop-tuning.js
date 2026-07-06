// ─── 3D Print Assistant — Workshop tuning harvest (IMPL-044 W3, gate B3) ─────
// Pure app-layer: turns Workshop print journals into bounded, accept-or-dismiss
// tuning suggestions. Spec: docs/specs/IMPL-044-W3W4-mine-tier-and-custom-filaments.md
// §3.1–3.6; plan: docs/superpowers/plans/2026-07-06-impl-044-w3w4-plan.md Task 3.
//
// Suggestions are a PURE recomputation from (journals × rules × ledger) — never
// stored. All date gates use the FIRING NOZZLE BUCKET's newest failure, never
// the symptom-wide newest (a stray failure on another nozzle must not refresh
// gates). Accepted offsets are consumed by NOTHING in the engine yet — they are
// the durable input the future Mine tier reads (W3 engine train).
//
// createWorkshopTuning(store, rules, engineFacts):
//   store       — createWorkshopStore instance (tuning ledger APIs)
//   rules       — { TUNING_RULES, rulesForSymptom } from workshop-tuning-rules.js
//   engineFacts — { materialGroup(id), printerExists(id), materialExists(id),
//                   symptomName(id) } thin adapter; this module never loads the engine.

function createWorkshopTuning(store, rules, engineFacts) {

  function _clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, Math.round(v * 100) / 100));
  }

  function harvest() {
    const profiles = store.list();
    const tuning = store.getTuning();

    // Group journal entries by printer|material pair, carrying each profile's nozzle + env.
    const pairs = new Map();
    profiles.forEach(p => {
      const s = p.state || {};
      if (!s.printer || !s.material) return;
      const key = s.printer + '|' + s.material;
      if (!pairs.has(key)) pairs.set(key, { printerId: s.printer, materialId: s.material, entries: [] });
      (Array.isArray(p.journal) ? p.journal : []).forEach(o => {
        if (o && typeof o === 'object') {
          pairs.get(key).entries.push({ o, nozzle: s.nozzle || '(none)', env: s.environment || null });
        }
      });
    });

    const results = [];
    pairs.forEach((pair, pairKey) => {
      // Unknown ids: skip entirely — journal untouched, no guessing (spec §3.1).
      if (!engineFacts.printerExists(pair.printerId) || !engineFacts.materialExists(pair.materialId)) return;
      const group = engineFacts.materialGroup(pair.materialId);

      const workedEntries = pair.entries.filter(e => e.o.result === 'worked');
      const workedNewest = workedEntries.reduce((mx, e) => (e.o.date > mx ? e.o.date : mx), '');

      // Per-symptom nozzle buckets of failed outcomes.
      const bySymptom = new Map();
      pair.entries.forEach(e => {
        if (e.o.result !== 'failed') return;
        (Array.isArray(e.o.symptoms) ? e.o.symptoms : []).forEach(sid => {
          if (!bySymptom.has(sid)) bySymptom.set(sid, new Map());
          const buckets = bySymptom.get(sid);
          if (!buckets.has(e.nozzle)) buckets.set(e.nozzle, []);
          buckets.get(e.nozzle).push(e);
        });
      });

      const offsetCandidates = [];
      bySymptom.forEach((buckets, sid) => {
        // Firing bucket: >=2 same-nozzle failures; newest lastFail wins a tie.
        let firing = null;
        buckets.forEach((entries, nz) => {
          if (entries.length < 2) return;
          const last = entries.reduce((mx, e) => (e.o.date > mx ? e.o.date : mx), '');
          if (!firing || last > firing.last) firing = { nozzle: nz, entries, last };
        });
        if (!firing) return;
        // Positive lock-out (deliberately pair-wide — spec §3.2).
        if (workedNewest && workedNewest > firing.last) return;

        const r = rules.rulesForSymptom(sid, group);
        if (!r.primary) return;
        const evidence = {
          failed: firing.entries.length,
          worked: workedEntries.length,
          lastDate: firing.last,
          nozzles: [firing.nozzle],
          environments: [...new Set(firing.entries.map(e => e.env).filter(Boolean))],
        };
        const secondaryHints = r.secondaries.map(x => x.why);

        if (r.primary.kind === 'advice') {
          const key = `${pair.printerId}|${pair.materialId}|${sid}|${r.primary.adviceKey}`;
          const dis = store.getDismissal(key);
          if (dis && firing.last <= dis.date) return;
          results.push({
            key, kind: 'advice', printerId: pair.printerId, materialId: pair.materialId,
            symptomId: sid, adviceKey: r.primary.adviceKey, why: r.primary.why,
            secondaryHints, evidence,
          });
          return;
        }

        const key = `${pair.printerId}|${pair.materialId}|${sid}|${r.primary.offsetKey}`;
        // Dismissed, and no failure newer than the dismissal → stay quiet.
        const dis = store.getDismissal(key);
        if (dis && firing.last <= dis.date) return;
        // Anti-ride: an accept for this pair+offsetKey+SAME symptom at/after the
        // bucket's newest failure means no re-suggestion without fresh evidence.
        const entry = tuning.accepted.find(e => e.pairKey === pairKey && e.offsetKey === r.primary.offsetKey);
        if (entry && entry.ops.some(op =>
          op.kind === 'accept' && op.symptomId === sid && op.date >= firing.last)) return;
        // Clamp stop: next step would pass the cumulative clamp → nothing to offer.
        const current = entry ? entry.value : 0;
        const next = current + r.primary.step;
        if (next < r.primary.clampMin || next > r.primary.clampMax) return;

        offsetCandidates.push({
          key, kind: 'offset', printerId: pair.printerId, materialId: pair.materialId,
          symptomId: sid, offsetKey: r.primary.offsetKey,
          step: r.primary.step, unit: r.primary.unit, direction: r.primary.direction,
          clampMin: r.primary.clampMin, clampMax: r.primary.clampMax,
          cumulativeAfterAccept: _clamp(next, r.primary.clampMin, r.primary.clampMax),
          why: r.primary.why, secondaryHints, evidence,
        });
      });

      // Contradiction pass (primary scope): opposing directions on one offsetKey
      // collapse into a single dismissible conflict card (spec §3.2).
      const byOffsetKey = new Map();
      offsetCandidates.forEach(c => {
        if (!byOffsetKey.has(c.offsetKey)) byOffsetKey.set(c.offsetKey, []);
        byOffsetKey.get(c.offsetKey).push(c);
      });
      byOffsetKey.forEach((cands, offsetKey) => {
        const dirs = new Set(cands.map(c => c.direction));
        if (dirs.size > 1) {
          const key = `${pair.printerId}|${pair.materialId}|conflict|${offsetKey}`;
          const newest = cands.reduce((mx, c) => (c.evidence.lastDate > mx ? c.evidence.lastDate : mx), '');
          const dis = store.getDismissal(key);
          if (dis && newest <= dis.date) return;
          results.push({
            key, kind: 'conflict', printerId: pair.printerId, materialId: pair.materialId,
            offsetKey, conflictingSymptoms: cands.map(c => c.symptomId),
            evidence: { lastDate: newest },
          });
        } else {
          results.push(...cands);
        }
      });
    });

    results.sort((a, b) =>
      `${a.printerId}|${a.materialId}|${a.symptomId || ''}`.localeCompare(
        `${b.printerId}|${b.materialId}|${b.symptomId || ''}`));
    return results;
  }

  function accept(suggestion) {
    if (!suggestion || suggestion.kind !== 'offset') return { ok: false, error: 'not-offset' };
    return store.addTuningOp(
      suggestion.printerId + '|' + suggestion.materialId,
      suggestion.offsetKey, suggestion.unit,
      { kind: 'accept', step: suggestion.step, symptomId: suggestion.symptomId,
        clampMin: suggestion.clampMin, clampMax: suggestion.clampMax });
  }

  function dismiss(suggestion) {
    if (!suggestion || !suggestion.key) return { ok: false, error: 'no-key' };
    return store.dismissSuggestion(suggestion.key);
  }

  function revert(pairKey, offsetKey) {
    return store.revertTuning(pairKey, offsetKey);
  }

  // The future Mine-tier consumption point (W3 engine train): cumulative,
  // clamped offsets for one printer+material pair. Zero-value entries omitted.
  function acceptedFor(printerId, materialId) {
    const pk = printerId + '|' + materialId;
    const out = {};
    store.getTuning().accepted.forEach(e => {
      if (e.pairKey === pk && e.value !== 0) out[e.offsetKey] = { value: e.value, unit: e.unit };
    });
    return out;
  }

  return { harvest, accept, dismiss, revert, acceptedFor };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createWorkshopTuning };
}
