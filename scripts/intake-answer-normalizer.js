#!/usr/bin/env node
// ─── Intake answer normalizer ───────────────────────────────────────────────
//
// Reads owner answers on `intake-needs-data` issues and posts ONE canonical
// block, so the 12:00 intake run's existing parser consumes them as if they had
// been hand-typed. Runs at 11:30, half an hour ahead of the run.
//
// Design: docs/superpowers/specs/2026-08-06-intake-answer-normalizer-design.md
//
// WHY THIS EXISTS. The owner-question loop failed its first live test five times
// running, every time on FORMAT and never on content: answered in a comment,
// answered without a ``` fence, wrote `None` instead of `none`. The parser is
// now tolerant of 19 shapes, but an answer written purely as prose still cannot
// be read mechanically. This closes that last gap.
//
// THE BOUNDARY. The agent transcribes; it never witnesses. "The owner wrote it's
// open, so write enclosure: none" is translation. "I conclude the printer is
// open" is fabricated provenance — the thing an earlier design was killed for.
// validateTranscription() enforces that mechanically: every field the agent
// emits must be one the owner actually named, and every source URL must appear
// verbatim in the owner's own text. The prompt asks; the validator checks.
//
// ADDITIVE ONLY. The entire output of this program is a GitHub issue comment.
// Nothing in the intake shipping lane changes, so a broken normalizer degrades
// to exactly today's behaviour rather than breaking the path to production.
//
// Usage:
//   node scripts/intake-answer-normalizer.js            # dry run, posts nothing
//   node scripts/intake-answer-normalizer.js --apply    # posts
//   node scripts/intake-answer-normalizer.js --apply --repo owner/name

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { parseAnswers, LABEL } = require('./intake-owner-questions.js');
const { OWNER_ATTESTABLE_FIELDS } = require('./validate-candidate-evidence.js');

const MARKER = '<!-- intake-answer-normalizer -->';

// Only the accepted tokens, so the agent is never in a position to invent one.
const FIELD_TOKENS = {
  enclosure: 'none | passive | active_heated',
  series: 'bedslinger | corexy',
  available_plates:
    'cool_plate | engineering_plate | high_temp_plate | satin_pei | smooth_glass'
    + ' | smooth_pei | textured_pei   (comma-separated if more than one)',
};

function ownerComments(issue) {
  const owner = (issue.author && issue.author.login) || null;
  return (Array.isArray(issue.comments) ? issue.comments : [])
    .filter((c) => c && c.author && (!owner || c.author.login === owner))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

// Needed when the owner has written something the parser cannot already read,
// and we have not already transcribed that same content. Anchoring on our own
// marker's timestamp is what makes this idempotent AND still responsive to a
// correction posted after we ran.
function needsNormalizing(issue) {
  const mine = ownerComments(issue);
  if (mine.length === 0) return { needed: false, reason: 'no owner comments' };

  const lastMarkerAt = mine
    .filter((c) => String(c.body || '').includes(MARKER))
    .map((c) => String(c.createdAt))
    .sort()
    .at(-1) || '';

  const fresh = mine.filter((c) => !String(c.body || '').includes(MARKER)
    && String(c.createdAt) > lastMarkerAt);
  if (fresh.length === 0) {
    return { needed: false, reason: 'nothing new since the last normalization' };
  }

  if (fresh.some((c) => parseAnswers(c.body).answers.length > 0)) {
    return { needed: false, reason: 'owner answer already parses' };
  }

  return { needed: true, reason: `${fresh.length} unparsed owner comment(s)` };
}

function normalizeUrl(url) {
  return String(url || '').trim().replace(/[.,;:!?)\]]+$/, '').toLowerCase();
}

// The agent is NOT trusted. Its output is checked against the owner's raw text:
// every field must be one the owner named, every source must be a URL the owner
// actually wrote. This is what makes "may transcribe, never witness" a
// mechanical property rather than a hopeful instruction in a prompt.
function validateTranscription(block, ownerText) {
  const errors = [];
  const { answers, errors: parseErrors } = parseAnswers(block);
  for (const e of parseErrors) errors.push(`agent block: ${e}`);
  if (answers.length === 0) {
    errors.push('agent block produced no answers');
    return { ok: false, errors, answers: [] };
  }

  const haystack = String(ownerText || '').toLowerCase();
  const ownerUrls = new Set(
    (String(ownerText || '').match(/https?:\/\/[^\s<>()[\]"']+/gi) || []).map(normalizeUrl),
  );

  const kept = [];
  for (const answer of answers) {
    if (!OWNER_ATTESTABLE_FIELDS.has(answer.field)) {
      errors.push(`${answer.field} is not owner-attestable`);
      continue;
    }
    // The owner must have named the field, in code or in prose
    // ("available_plates" or "available plates").
    const spoken = answer.field.replace(/_/g, ' ').toLowerCase();
    if (!haystack.includes(answer.field.toLowerCase()) && !haystack.includes(spoken)) {
      errors.push(`${answer.field}: the owner did not mention this field`);
    }
    if (!ownerUrls.has(normalizeUrl(answer.source))) {
      errors.push(`${answer.field}: source ${answer.source} was not written by the owner`);
    }
    kept.push(answer);
  }
  return { ok: errors.length === 0, errors, answers: errors.length ? [] : kept };
}

function buildPrompt(candidateId, fields, ownerText) {
  const preamble = fs.readFileSync(path.join(__dirname, 'intake-normalizer-prompt.md'), 'utf8');
  const wanted = fields
    .filter((f) => OWNER_ATTESTABLE_FIELDS.has(f))
    .map((f) => `  ${f}: ${FIELD_TOKENS[f]}`)
    .join('\n');
  return `${preamble}
Printer: ${candidateId}

Fields you may answer, and the ONLY accepted values for each:
${wanted}

What the owner wrote:
--- BEGIN OWNER TEXT ---
${ownerText}
--- END OWNER TEXT ---

Emit exactly this shape, one entry per field you can faithfully transcribe:

answers:
  <field>:
    value: <one of the accepted tokens above>
    source: <a URL copied verbatim from the owner text>
    claim: "<the owner's own words describing what that source shows>"
`;
}

// Bounded: one turn, hard timeout. A failure here is non-blocking by design —
// the caller posts nothing and the 12:00 run behaves exactly as today.
function runAgent(prompt, options = {}) {
  const claudeBin = options.claudeBin || 'claude';
  return execFileSync(claudeBin, ['-p', prompt, '--output-format', 'text'], {
    encoding: 'utf8',
    timeout: options.timeoutMs || 240000,
    maxBuffer: 8 * 1024 * 1024,
  }).trim();
}

function normalizeIssue(issue, deps = {}) {
  const check = needsNormalizing(issue);
  if (!check.needed) return { posted: false, reason: check.reason, block: null };

  const match = (issue.body || '').match(/\*\*([A-Za-z0-9._-]+)\*\*/);
  const candidateId = match ? match[1] : `issue-${issue.number}`;
  const fields = deps.fields || [...OWNER_ATTESTABLE_FIELDS];
  const ownerText = ownerComments(issue)
    .filter((c) => !String(c.body || '').includes(MARKER))
    .map((c) => c.body)
    .join('\n\n');

  let raw;
  try {
    raw = (deps.agent || runAgent)(buildPrompt(candidateId, fields, ownerText));
  } catch (error) {
    return { posted: false, reason: `agent failed: ${error.message}`, block: null };
  }

  const validation = validateTranscription(raw, ownerText);
  if (!validation.ok) {
    return { posted: false, reason: `rejected: ${validation.errors.join('; ')}`, block: raw };
  }
  if (!deps.apply) return { posted: false, reason: 'dry-run', block: raw };

  const cleaned = String(raw).replace(/```ya?ml\s*/gi, '').replace(/```/g, '').trim();
  const body = `${MARKER}\nTranscribed from your answer above so the intake run can read it.`
    + ' Nothing here is researched — it is only your own words restated.'
    + ` Reply again to correct anything.\n\n\`\`\`yaml\n${cleaned}\n\`\`\``;
  (deps.post || (() => {}))(issue.number, body);
  return { posted: true, reason: `transcribed ${validation.answers.length} field(s)`, block: raw };
}

module.exports = {
  MARKER, needsNormalizing, ownerComments, validateTranscription,
  buildPrompt, runAgent, normalizeIssue,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const repoIndex = args.indexOf('--repo');
  const repoArgs = repoIndex >= 0 ? ['--repo', args[repoIndex + 1]] : [];
  try {
    const raw = execFileSync('gh', ['issue', 'list', '--label', LABEL, '--state', 'open',
      '--json', 'number,title,body,author,comments', '--limit', '100', ...repoArgs],
    { encoding: 'utf8' });
    const issues = JSON.parse(raw || '[]');
    let posted = 0;
    for (const issue of issues) {
      const result = normalizeIssue(issue, {
        apply,
        post: (n, body) => execFileSync('gh', ['issue', 'comment', String(n), '--body', body, ...repoArgs]),
      });
      if (result.posted) posted += 1;
      console.log(`  #${issue.number} posted=${result.posted} ${result.reason}`);
    }
    console.log(`NORMALIZER ok=true issues=${issues.length} posted=${posted}`);
  } catch (error) {
    console.error(`NORMALIZER ok=false reason=${error.message}`);
    process.exit(1);
  }
}
