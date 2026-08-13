#!/usr/bin/env node
// ─── Owner question issues ──────────────────────────────────────────────────
//
// When a candidate parks on a field the manufacturer never states, the runner
// opens ONE GitHub issue asking the owner. The owner edits a fenced block in
// the browser, and the next scheduled run consumes it. Nobody is blocked: if
// the issue is unanswered the run simply does nothing and asks again tomorrow.
//
// Design decisions taken by the owner 2026-08-04, deliberately simpler than
// the reviewer proposed:
//   - NO nonce / no cryptographic issue binding. This is a private, single-owner
//     repo; the "someone else edits the issue" threat model does not exist and
//     the ceremony would be process for its own sake.
//   - NO answer expiry against a packet SHA. Answers may be added a field at a
//     time across days and must all still count.
//
// The safety property is NOT in this file — it is the OWNER_ATTESTABLE_FIELDS
// allowlist in validate-candidate-evidence.js. This module can only ever ask
// about, and pass through, fields on that list. A YAML block naming a bed
// temperature is rejected here AND at the writer AND at the gate.
//
// Usage:
//   node scripts/intake-owner-questions.js open   --candidate <id> --fields a,b [--tried "..."] [--repo owner/name]
//   node scripts/intake-owner-questions.js read   --candidate <id> [--repo owner/name]
//   node scripts/intake-owner-questions.js close  --candidate <id> --comment "..." [--repo owner/name]

const { execFileSync } = require('node:child_process');
const { OWNER_ATTESTABLE_FIELDS } = require('./validate-candidate-evidence.js');

const LABEL = 'intake-needs-data';
const ID_RE = /^[A-Za-z0-9._-]+$/;

// Ask what the field MEANS in this catalog, not what its name suggests. The
// first live run failed on exactly this: `series` reads as "product line", so
// the owner answered "Adventurer 3 Series" — which is `series_group`, a
// different field that was already confirmed. Every prompt now names the real
// question and enumerates the only values the writer will accept.
const FIELD_PROMPTS = {
  enclosure:
    'none | passive | active_heated'
    + '   — none = open frame, passive = enclosed box, active_heated = heated chamber',
  series:
    'bedslinger | corexy'
    + '   — FRAME TYPE, not product line. bedslinger = the BED moves front-to-back;'
    + ' corexy = the bed only moves down and the toolhead moves in X/Y.'
    + ' (The product line is `series_group` and is already filled in.)',
  available_plates:
    'one or more of: cool_plate, engineering_plate, epoxy_resin, high_temp_plate, satin_pei,'
    + ' smooth_glass, smooth_pei, textured_pei'
    + '   — comma-separated. Only these ids are accepted.',
};

function gh(args, { allowFail = false } = {}) {
  try {
    return execFileSync('gh', args, { encoding: 'utf8' });
  } catch (error) {
    if (allowFail) return '';
    throw new Error(`gh ${args.slice(0, 2).join(' ')} failed: ${(error.stderr || error.message).toString().slice(0, 300)}`);
  }
}

function assertCandidate(id) {
  if (typeof id !== 'string' || !ID_RE.test(id)) {
    throw new Error('candidate must match [A-Za-z0-9._-]+');
  }
  return id;
}

// Only ever ask about fields the gate could actually accept an answer for.
// Asking about a bed temperature would train the owner to expect it to work.
function attestableOnly(fields) {
  const asked = (Array.isArray(fields) ? fields : String(fields || '').split(','))
    .map((f) => f.trim()).filter(Boolean);
  const allowed = asked.filter((f) => OWNER_ATTESTABLE_FIELDS.has(f));
  const refused = asked.filter((f) => !OWNER_ATTESTABLE_FIELDS.has(f));
  return { allowed, refused };
}

function issueTitle(candidateId, fields) {
  return `intake: ${candidateId} needs ${fields.length} field${fields.length === 1 ? '' : 's'}`;
}

function buildBody(candidateId, fields, tried) {
  const block = fields.map((f) => [
    `  ${f}:`,
    '    value:   # ' + (FIELD_PROMPTS[f] || 'the value'),
    '    source:  # a URL backing this (a review, a photo page, the manual — anything you actually looked at)',
    '    claim:   # what that source shows — QUOTE IT if it contains a # character',
  ].join('\n')).join('\n');

  return `The intake pipeline researched **${candidateId}** and confirmed everything it could from the
manufacturer. It could not confirm the field${fields.length === 1 ? '' : 's'} below, so it parked rather than guess.

${tried ? `**Already tried:** ${tried}\n` : ''}
**Reply to this issue** with the block below filled in — a comment is fine, editing this
body works too. Leave the issue open; the next scheduled run picks it up.
You can answer one field now and the rest later; partial answers are kept, and a later
answer supersedes an earlier one for the same field.

\`\`\`yaml
answers:
${block}
\`\`\`

---
Recorded as \`owner-attested\` — never as manufacturer evidence — with your name, the date,
and your claim. Temperatures, speeds, acceleration and nozzle sizes can never be answered
this way; those always park.

<sub>Opened automatically by the intake runner. Closes itself when consumed.</sub>`;
}

function findIssue(candidateId, repoArgs) {
  const raw = gh(['issue', 'list', '--label', LABEL, '--state', 'open',
    '--json', 'number,title,body,author,comments', '--limit', '100', ...repoArgs], { allowFail: true });
  if (!raw.trim()) return null;
  let list;
  try { list = JSON.parse(raw); } catch (_) { return null; }
  const marker = `**${candidateId}**`;
  return list.find((i) => (i.body || '').includes(marker)) || null;
}

function openQuestion(options) {
  const candidateId = assertCandidate(options.candidate);
  const { allowed, refused } = attestableOnly(options.fields);
  if (allowed.length === 0) {
    throw new Error(`no owner-attestable fields among [${String(options.fields)}]; nothing to ask`);
  }
  const repoArgs = options.repo ? ['--repo', options.repo] : [];
  const existing = findIssue(candidateId, repoArgs);
  if (existing) {
    return { changed: false, action: 'open', issue: existing.number, refused };
  }
  if (!options.apply) {
    return { changed: false, action: 'open', issue: null, refused, wouldAsk: allowed };
  }
  const out = gh(['issue', 'create', '--label', LABEL,
    '--title', issueTitle(candidateId, allowed),
    '--body', buildBody(candidateId, allowed, options.tried), ...repoArgs]);
  const number = Number((out.match(/\/issues\/(\d+)/) || [])[1]) || null;
  return { changed: true, action: 'open', issue: number, refused };
}

// ─── Understanding the owner, not policing them ─────────────────────────────
//
// The first live test failed three times running, every time on FORMAT and
// never on content: answered in a comment (parser read only the body), answered
// without a ``` fence (parser demanded one), wrote `None` (enum was
// case-sensitive). Each was a real answer with a real source, discarded.
//
// A strict input parser is not a safety mechanism. The safety properties are
// downstream and are untouched by anything here: OWNER_ATTESTABLE_FIELDS limits
// which fields can ever be answered, ATTESTED_ENUMS/KNOWN_PLATE_IDS force
// catalog tokens, buildAttestation requires an http(s) source and a claim, and
// the candidate still faces the evidence gate, both reviewers, live verify and
// custody. So: be liberal in what is accepted here, strict where it counts.
//
// Understood shapes: fenced or bare; with or without an `answers:` header;
// nested or flat; any indentation; `key: value` or `key = value`; markdown
// bullets, bold and links; any capitalisation of field names, keys and values;
// a source URL given explicitly, as a markdown link, or simply present in the
// text. What is NOT inferred: a value never seen, and a field not on the
// allowlist.
const URL_RE = /https?:\/\/[^\s<>()\[\]"']+/i;

// Field names the pipeline knows about, so a non-attestable answer can be
// reported by name rather than silently ignored.
const KNOWN_FIELD_NAMES = new Set([
  ...OWNER_ATTESTABLE_FIELDS,
  'series_group', 'extruder_type', 'max_nozzle_temp', 'max_bed_temp', 'max_speed',
  'max_acceleration', 'available_nozzle_sizes', 'multi_color_systems',
  'active_chamber_heating', 'has_camera', 'has_lidar', 'notes',
]);

// Strip the decoration a person naturally types in a GitHub comment.
function denoise(line) {
  return String(line)
    .replace(/^\s*[-*+]\s+/, '')       // list bullets
    .replace(/^\s*#{1,6}\s+/, '')      // headings
    .replace(/\*\*/g, '')              // bold
    .replace(/^\s*>\s?/, '')           // quotes
    .replace(/\s+$/, '');
}

// `key = value` is as clear as `key: value`; accept both.
function splitKeyValue(line) {
  const match = denoise(line).match(/^(\s*)([A-Za-z_][A-Za-z0-9_ ]*?)\s*[:=]\s*(.*)$/);
  if (!match) return null;
  return { indent: match[1].length, key: match[2].trim().toLowerCase(), rest: match[3].trim() };
}

function extractUrl(text) {
  const str = String(text || '');
  const link = str.match(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i);   // [label](url)
  if (link) return link[1];
  const bare = str.match(URL_RE);
  return bare ? bare[0].replace(/[.,;:!?]+$/, '') : null;
}

function unquote(value) {
  const raw = String(value || '').trim();
  const quoted = raw.match(/^(["'])([\s\S]*)\1$/);
  return quoted ? quoted[2].trim() : raw;
}

// Comment tails are the template's own hints. A quoted scalar is verbatim, so a
// `#` inside it is content. Unquoted `#` in free prose is ambiguous and the
// value is refused rather than silently truncated.
function stripComment(value, key) {
  const raw = String(value || '').trim();
  if (/^[|>]/.test(raw)) throw new Error('multi-line values are not supported — keep the answer on one line');
  const quoted = raw.match(/^(["'])([\s\S]*)\1\s*(?:#.*)?$/);
  if (quoted) return quoted[2].trim();
  if (/^["']/.test(raw)) throw new Error('unterminated quote — close the quote or remove it');
  const stripped = raw.replace(/(^|\s+)#.*$/, '').trim();
  if (key === 'claim' && stripped && stripped !== raw) {
    throw new Error('unquoted "#" is read as a comment — wrap the claim in quotes to keep it');
  }
  return stripped;
}

function parseAnswers(body) {
  const text = String(body || '');
  const fence = text.match(/```ya?ml\s*\n([\s\S]*?)```/i);
  const lines = (fence ? fence[1] : text).split('\n');

  const blocks = [];
  let current = null;
  for (const line of lines) {
    const kv = splitKeyValue(line);
    if (kv && kv.key === 'answers' && !kv.rest) continue;   // optional header
    if (kv && KNOWN_FIELD_NAMES.has(kv.key)) {
      current = { field: kv.key, lines: [], inline: kv.rest, malformed: null };
      blocks.push(current);
      continue;
    }
    if (current) current.lines.push(line);
  }

  const answers = [];
  const errors = [];
  for (const block of blocks) {
    if (!OWNER_ATTESTABLE_FIELDS.has(block.field)) {
      errors.push(`${block.field} is not owner-attestable — ignored`);
      continue;
    }
    const parts = {};
    for (const line of block.lines) {
      const kv = splitKeyValue(line);
      if (!kv || !['value', 'source', 'claim'].includes(kv.key)) continue;
      try {
        parts[kv.key] = stripComment(kv.rest, kv.key);
      } catch (error) {
        block.malformed = `${kv.key}: ${error.message}`;
      }
    }
    if (block.malformed) {
      errors.push(`${block.field} ${block.malformed} — not consumed`);
      continue;
    }

    let value = parts.value;
    if (!value && block.inline) {
      try { value = stripComment(block.inline, 'value'); } catch (_) { value = ''; }
    }
    // A source may be named explicitly, wrapped in a markdown link, or simply
    // present somewhere in the block's text.
    const source = extractUrl(parts.source) || extractUrl(block.lines.join('\n')) || extractUrl(block.inline);
    const claim = unquote(parts.claim);

    // A field the owner merely mentioned is not an answer — never invent one.
    if (!value && !source && !claim) continue;
    if (!value) { errors.push(`${block.field} has no value — not consumed`); continue; }
    if (!source) { errors.push(`${block.field} has no source URL — not consumed`); continue; }
    if (!claim) { errors.push(`${block.field} has no claim describing what the source shows — not consumed`); continue; }
    answers.push({ field: block.field, value: unquote(value), source, claim });
  }
  return { answers, errors };
}


function collectAnswerSources(issue, ownerLogin) {
  const sources = [{ body: issue.body, by: (issue.author && issue.author.login) || null, at: '' }];
  for (const comment of Array.isArray(issue.comments) ? issue.comments : []) {
    sources.push({
      body: comment.body,
      by: (comment.author && comment.author.login) || null,
      at: comment.createdAt || '',
    });
  }
  const filtered = ownerLogin
    ? sources.filter((src) => !src.by || src.by === ownerLogin)
    : sources;
  // Stable sort: equal/missing createdAt keeps insertion order, so the body
  // stays first and comments keep their natural sequence.
  return filtered
    .map((src, index) => ({ src, index }))
    .sort((a, b) => String(a.src.at).localeCompare(String(b.src.at)) || (a.index - b.index))
    .map((entry) => entry.src);
}

function readAnswers(options) {
  const candidateId = assertCandidate(options.candidate);
  const repoArgs = options.repo ? ['--repo', options.repo] : [];
  const issue = findIssue(candidateId, repoArgs);
  if (!issue) return { action: 'read', issue: null, answers: [], errors: [] };

  // Answers count only from the repo owner. On a private single-owner repo this
  // changes nothing day to day and costs the owner no extra step, but as code it
  // stops a collaborator, bot or integration from injecting an owner-attested
  // value simply by commenting.
  const ownerLogin = options.ownerLogin || (issue.author && issue.author.login) || null;
  const byField = new Map();
  const errors = [];
  let sawBlock = false;
  const skipped = (Array.isArray(issue.comments) ? issue.comments : [])
    .filter((c) => c && c.author && ownerLogin && c.author.login !== ownerLogin
      && /```ya?ml/i.test(c.body || ''));
  for (const c of skipped) {
    errors.push(`answer block from ${c.author.login} ignored — only ${ownerLogin} may answer`);
  }
  for (const source of collectAnswerSources(issue, ownerLogin)) {
    // A source counts as "carrying a block" if it has the `answers:` key at
    // all, fenced or not. Prose comments alongside a real answer are normal.
    if (/^\s*answers:\s*$/m.test(String(source.body || ''))) sawBlock = true;
    const parsed = parseAnswers(source.body);
    for (const e of parsed.errors) errors.push(e);
    for (const answer of parsed.answers) {
      byField.set(answer.field, { ...answer, answeredBy: source.by });
    }
  }
  if (!sawBlock) errors.push('no `answers:` block found in the issue body or any comment');

  // A field that ended up with a good answer should not also carry a complaint
  // about an earlier partial attempt — with prose comments now partly
  // recognised, an early "**Series:** it belongs to the Adventurer line" would
  // otherwise leave a permanent NOTE beside a perfectly good later answer.
  const answered = new Set([...byField.keys()]);
  return {
    action: 'read',
    issue: issue.number,
    answeredBy: (issue.author && issue.author.login) || null,
    answers: [...byField.values()],
    errors: errors.filter((e) => ![...answered].some((f) => e.startsWith(`${f} `))),
  };
}

function closeQuestion(options) {
  const candidateId = assertCandidate(options.candidate);
  const repoArgs = options.repo ? ['--repo', options.repo] : [];
  const issue = findIssue(candidateId, repoArgs);
  if (!issue) return { changed: false, action: 'close', issue: null };
  if (!options.apply) return { changed: false, action: 'close', issue: issue.number };
  gh(['issue', 'close', String(issue.number), '--comment',
    options.comment || 'Consumed by the intake runner.', ...repoArgs]);
  return { changed: true, action: 'close', issue: issue.number };
}

function parseCli(argv) {
  const [command, ...rest] = argv;
  if (!['open', 'read', 'close'].includes(command)) {
    throw new Error('command must be open, read, or close');
  }
  const options = { apply: false };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--apply') { options.apply = true; continue; }
    if (arg === '--dry-run') { options.apply = false; continue; }
    const value = rest[++i];
    if (value === undefined) throw new Error(`${arg} requires a value`);
    const key = {
      '--candidate': 'candidate', '--fields': 'fields', '--tried': 'tried',
      '--repo': 'repo', '--comment': 'comment',
    }[arg];
    if (!key) throw new Error(`unknown argument ${arg}`);
    options[key] = value;
  }
  return { command, options };
}

module.exports = { parseAnswers, buildBody, attestableOnly, collectAnswerSources, openQuestion, readAnswers, closeQuestion, LABEL };

if (require.main === module) {
  try {
    const { command, options } = parseCli(process.argv.slice(2));
    const result = command === 'open' ? openQuestion(options)
      : command === 'read' ? readAnswers(options)
        : closeQuestion(options);
    if (command === 'read') {
      console.log(`OWNERQUESTION ok=true action=read issue=${result.issue ?? 'none'} answered=${result.answers.length} errors=${result.errors.length}`);
      for (const a of result.answers) console.log(`  ANSWER ${a.field}=${JSON.stringify(a.value)} source=${a.source}`);
      for (const e of result.errors) console.log(`  NOTE ${e}`);
    } else {
      console.log(`OWNERQUESTION ok=true action=${result.action} issue=${result.issue ?? 'none'} changed=${result.changed}`);
    }
  } catch (error) {
    console.error(`OWNERQUESTION ok=false reason=${error.message}`);
    process.exit(1);
  }
}
