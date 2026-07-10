#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DEFAULT_PATH = path.join(__dirname, 'intake-park-taxonomy.json');
const REQUIRED_SANCTIONED_EDGES = new Set(['owner-instruction', 'rd3-external-evidence']);

function loadTaxonomy(filePath = DEFAULT_PATH) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function classifyParkReason(reason, sidecar = {}, taxonomy = loadTaxonomy()) {
  for (const [className, def] of Object.entries(taxonomy.classes || {})) {
    if ((def.reasons || []).includes(reason)) {
      if (sidecar.tainted && def.taintedAllowed === false) {
        return { className: 'decision-required', trigger: 'owner', bound: null, reviewEntry: false };
      }
      return { className, trigger: def.trigger, bound: def.bound, reviewEntry: !!def.reviewEntry };
    }
  }
  return { className: 'decision-required', trigger: 'owner', bound: null, reviewEntry: false };
}

function validateTaxonomyGraph(taxonomy = loadTaxonomy()) {
  const violations = [];
  for (const [className, def] of Object.entries(taxonomy.classes || {})) {
    if (def.taintedAllowed === true && def.reviewEntry === true) {
      violations.push(`${className} allows taint and automatic review entry`);
    }
    if (def.taintedAllowed === true && ['next-run', 'weekly', 'immediate'].includes(def.trigger)) {
      violations.push(`${className} allows taint and automatic trigger ${def.trigger}`);
    }
  }

  for (const edge of taxonomy.sanctionedTaintedReviewEdges || []) {
    if (!REQUIRED_SANCTIONED_EDGES.has(edge)) {
      violations.push(`${edge} is not sanctioned for tainted review entry`);
    }
  }

  for (const edge of REQUIRED_SANCTIONED_EDGES) {
    if (!(taxonomy.sanctionedTaintedReviewEdges || []).includes(edge)) {
      violations.push(`required sanctioned tainted review edge missing: ${edge}`);
    }
  }

  return { ok: violations.length === 0, violations };
}

if (require.main === module) {
  const taxonomy = loadTaxonomy(process.argv[2] || DEFAULT_PATH);
  const result = validateTaxonomyGraph(taxonomy);
  for (const violation of result.violations) {
    console.error(`[intake-park-taxonomy] ${violation}`);
  }
  console.log(`[intake-park-taxonomy] ok=${result.ok}`);
  process.exit(result.ok ? 0 : 1);
}

module.exports = { loadTaxonomy, classifyParkReason, validateTaxonomyGraph };
