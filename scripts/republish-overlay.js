#!/usr/bin/env node
// republish-overlay.js — scripted iOS overlay republish (Intake Autonomy v2, Gate B1).
//
// Closes the hand-hash gap in the manual runbook path: every overlay publish
// (add, rollback, disable, version bump) recomputes payload_sha256, advances
// content_version by the SAME rule everywhere, and ends by running the ship
// validator — a republish that fails validation never touches the overlay file.
//
// Version rules (YYYYMMDDXX, UTC date):
//   forward publish:  next = max(current + 1, <today>01)
//   rollback/disable: next = max(bad deployed, snapshot, current) + 1   (PD6)
// The rollback rule exists because iOS rejects any remote overlay whose
// content_version is LOWER than the cached one (PrinterCatalogProvider
// poisoned-cache guard) — a naive snapshot re-publish silently no-ops on
// exactly the devices that cached the bad payload.
// Counter 99 / the 2099 cap fail LOUD (CRITICAL, non-zero exit) — the runner
// maps that to freeze + notify, never to a silent skip.
//
// CLI:
//   node scripts/republish-overlay.js --add-printer <id> [--add-brand <id>] [--min-app-version X]
//   node scripts/republish-overlay.js --rollback-to <snapshot.json> [--bad-version <YYYYMMDDXX>]
//   node scripts/republish-overlay.js --set-enabled false [--bad-version <YYYYMMDDXX>]
//   node scripts/republish-overlay.js --snapshot <out.json>
//   node scripts/republish-overlay.js --bump-version
// Path overrides (tests/fixtures): --overlay --baselines --printers --project

const fs = require('fs');
const path = require('path');
const {
  validateOverlay,
  stableStringify,
  sha256,
} = require('./validate-ios-printer-overlay.js');

const root = path.resolve(__dirname, '..');
const DEFAULTS = {
  overlayPath: path.join(root, 'catalog', 'ios-printer-overlay-v1.json'),
  baselinesPath: path.join(root, 'catalog', 'ios-bundled-catalog-baselines.json'),
  printersPath: path.join(root, 'data', 'printers.json'),
  projectPath: path.resolve(root, '..', '3dprintassistant-ios', 'project.yml'),
};

// Matches the validator's maximumReasonableContentVersion (not exported there).
const VERSION_CAP = 2_099_123_199;

function todayBaseUTC() {
  const d = new Date();
  return d.getUTCFullYear() * 10_000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

function assertPublishable(version, label) {
  if (!Number.isInteger(version)) {
    // NaN is comparison-transparent — without this, a garbage --bad-version
    // would silently zero the PD6 floor and republish AT the bad version.
    throw new Error(`CRITICAL: ${label} content_version is not an integer (${version}) — refusing to publish`);
  }
  if (version > VERSION_CAP) {
    throw new Error(`CRITICAL: ${label} content_version ${version} exceeds the 2099 cap (${VERSION_CAP}) — manual intervention required`);
  }
  if (version % 100 === 0) {
    // +1 on a …99 version numerically rolls into <next-date>00 — a phantom
    // date the scheme never legitimately produces. Refuse rather than publish
    // a version that lies about its publish date.
    throw new Error(`CRITICAL: ${label} content_version would overflow the daily counter (…99 + 1 = ${version}) — manual intervention required`);
  }
  return version;
}

// Forward-publish rule: max(current + 1, <today UTC>01).
function nextVersion(current, todayBase = todayBaseUTC()) {
  return assertPublishable(Math.max(current + 1, todayBase * 100 + 1), 'next');
}

// PD6 rollback/disable rule: max(bad deployed, snapshot, current) + 1.
function rollbackVersion({ snapshotVersion = 0, badVersion = 0, currentVersion = 0 }) {
  return assertPublishable(Math.max(snapshotVersion, badVersion, currentVersion) + 1, 'rollback');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Serialize with sorted top-level envelope keys (matches the committed file
// style); payload rows keep their source key order — canonical equality is
// stableStringify's job, not the file's.
function serializeOverlay(overlay) {
  const sorted = {};
  for (const key of Object.keys(overlay).sort()) sorted[key] = overlay[key];
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

// Validate-then-swap: the new overlay is written to a sibling temp file,
// validated there, and only renamed over the real path on success — a failed
// validation never corrupts the live file.
function writeValidated(overlay, opts) {
  const { overlayPath, baselinesPath, projectPath } = { ...DEFAULTS, ...opts };
  const tempPath = `${overlayPath}.republish-tmp`;
  fs.rmSync(tempPath, { force: true }); // stale temp from a crashed prior run
  fs.writeFileSync(tempPath, serializeOverlay(overlay));
  try {
    validateOverlay({ overlayPath: tempPath, baselinesPath, projectPath });
  } catch (error) {
    fs.rmSync(tempPath, { force: true });
    throw new Error(`validator rejected the republished overlay — file untouched: ${error.message}`);
  }
  fs.renameSync(tempPath, overlayPath);
}

function freshEnvelope(overlay, version) {
  overlay.content_version = version;
  overlay.generated_at = new Date().toISOString();
  overlay.payload_sha256 = sha256(stableStringify(overlay.payload));
  return overlay;
}

/**
 * Copy a printer row (and optionally a brand row) byte-identically from
 * data/printers.json into the overlay payload.
 */
function addPrinter(printerId, opts = {}) {
  const { overlayPath, printersPath, addBrand, minAppVersion } = { ...DEFAULTS, ...opts };
  const overlay = readJson(overlayPath);
  const source = readJson(printersPath);
  const existingIndex = overlay.payload.printers.findIndex((p) => p.id === printerId);
  const row = source.printers.find((p) => p.id === printerId);
  if (!row) throw new Error(`printer ${printerId} not found in ${printersPath}`);

  if (existingIndex !== -1) {
    if (addBrand || minAppVersion) {
      // Never silently discard a requested envelope change on the no-op path.
      throw new Error(`printer ${printerId} is already in the overlay, but ${[addBrand && '--add-brand', minAppVersion && '--min-app-version'].filter(Boolean).join(' + ')} was requested — refusing to no-op past an envelope change`);
    }
    if (stableStringify(overlay.payload.printers[existingIndex]) === stableStringify(row)) {
      return { changed: false, version: overlay.content_version, message: `printer ${printerId} is already in the overlay — no-op (no version churn)` };
    }
    overlay.payload.printers[existingIndex] = row;
    const version = nextVersion(overlay.content_version);
    writeValidated(freshEnvelope(overlay, version), opts);
    return { changed: true, version, message: `refreshed ${printerId} at content_version ${version}` };
  }

  if (addBrand) {
    if (!overlay.payload.brands.some((b) => b.id === addBrand)) {
      const brandRow = source.brands.find((b) => b.id === addBrand);
      if (!brandRow) throw new Error(`brand ${addBrand} not found in ${printersPath}`);
      overlay.payload.brands.push(brandRow);
    }
  }

  overlay.payload.printers.push(row);
  if (minAppVersion) overlay.min_app_version = minAppVersion;
  const version = nextVersion(overlay.content_version);
  writeValidated(freshEnvelope(overlay, version), opts);
  return { changed: true, version, message: `added ${printerId}${addBrand ? ` (+brand ${addBrand})` : ''} at content_version ${version}` };
}

/** Benign version-only republish; payload byte-identical (B5 drill/measurement tool). */
function bumpVersion(opts = {}) {
  const { overlayPath } = { ...DEFAULTS, ...opts };
  const overlay = readJson(overlayPath);
  const version = nextVersion(overlay.content_version);
  writeValidated(freshEnvelope(overlay, version), opts);
  return { changed: true, version, message: `bumped content_version to ${version} (payload unchanged)` };
}

/** PD6 rollback: snapshot payload republished ABOVE the bad deployed version. */
function rollbackTo(snapshotPath, opts = {}) {
  const { overlayPath, badVersion } = { ...DEFAULTS, ...opts };
  const overlay = readJson(overlayPath);
  const snapshot = readJson(snapshotPath);
  if (!Number.isInteger(snapshot.content_version)) {
    throw new Error(`${snapshotPath} is not an overlay snapshot (no integer content_version)`);
  }
  const version = rollbackVersion({
    snapshotVersion: snapshot.content_version,
    badVersion: badVersion || 0,
    currentVersion: overlay.content_version,
  });
  const restored = { ...snapshot };
  writeValidated(freshEnvelope(restored, version), opts);
  return { changed: true, version, message: `rolled back to snapshot ${path.basename(snapshotPath)} at content_version ${version}` };
}

/** PD8 content emergency stop (enabled:false) — same version rule as rollback. */
function setEnabled(enabled, opts = {}) {
  const { overlayPath, badVersion } = { ...DEFAULTS, ...opts };
  const overlay = readJson(overlayPath);
  if (overlay.enabled === enabled) {
    return { changed: false, version: overlay.content_version, message: `enabled is already ${enabled} — no-op` };
  }
  const version = rollbackVersion({
    snapshotVersion: 0,
    badVersion: badVersion || 0,
    currentVersion: overlay.content_version,
  });
  overlay.enabled = enabled;
  writeValidated(freshEnvelope(overlay, version), opts);
  return { changed: true, version, message: `set enabled=${enabled} at content_version ${version}` };
}

/** Byte-identical copy of the current overlay file as a known-good snapshot. */
function writeSnapshot(outPath, opts = {}) {
  const { overlayPath } = { ...DEFAULTS, ...opts };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.copyFileSync(overlayPath, outPath);
  return { changed: false, version: readJson(outPath).content_version, message: `snapshot written to ${outPath}` };
}

module.exports = {
  nextVersion,
  rollbackVersion,
  addPrinter,
  bumpVersion,
  rollbackTo,
  setEnabled,
  writeSnapshot,
  VERSION_CAP,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const opts = {};
  const flags = {};
  for (let i = 0; i < args.length; i += 1) {
    const take = () => {
      i += 1;
      if (i >= args.length) throw new Error(`missing value for ${args[i - 1]}`);
      return args[i];
    };
    switch (args[i]) {
      case '--add-printer': flags.addPrinter = take(); break;
      case '--add-brand': opts.addBrand = take(); break;
      case '--min-app-version': opts.minAppVersion = take(); break;
      case '--rollback-to': flags.rollbackTo = take(); break;
      case '--set-enabled': flags.setEnabled = take(); break;
      case '--snapshot': flags.snapshot = take(); break;
      case '--bump-version': flags.bumpVersion = true; break;
      case '--bad-version': {
        const v = Number(take());
        if (!Number.isInteger(v) || v < 1 || v > VERSION_CAP) {
          throw new Error(`--bad-version must be an integer YYYYMMDDXX (got: ${args[i]})`);
        }
        opts.badVersion = v;
        break;
      }
      case '--overlay': opts.overlayPath = take(); break;
      case '--baselines': opts.baselinesPath = take(); break;
      case '--printers': opts.printersPath = take(); break;
      case '--project': opts.projectPath = take(); break;
      default: throw new Error(`unknown argument: ${args[i]}`);
    }
  }

  const modes = ['addPrinter', 'rollbackTo', 'setEnabled', 'snapshot', 'bumpVersion'].filter((m) => flags[m]);
  try {
    if (modes.length !== 1) {
      throw new Error('exactly one mode required: --add-printer | --rollback-to | --set-enabled | --snapshot | --bump-version');
    }
    let result;
    if (flags.addPrinter) result = addPrinter(flags.addPrinter, opts);
    else if (flags.rollbackTo) result = rollbackTo(flags.rollbackTo, opts);
    else if (flags.setEnabled) {
      if (flags.setEnabled !== 'true' && flags.setEnabled !== 'false') throw new Error('--set-enabled takes true|false');
      result = setEnabled(flags.setEnabled === 'true', opts);
    } else if (flags.snapshot) result = writeSnapshot(flags.snapshot, opts);
    else result = bumpVersion(opts);
    // Trailing machine-readable token — the runner keys on this, not the prose.
    console.log(`[republish-overlay] ${result.message} | changed=${result.changed} version=${result.version}`);
  } catch (error) {
    console.error(`[republish-overlay] ${error.message}`);
    process.exit(error.message.startsWith('CRITICAL') ? 2 : 1);
  }
}
