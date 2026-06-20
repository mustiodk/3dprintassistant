// ─── Deterministic printer-mention extractor (S2 + research-capable screening) ──
//
// Pure ESM, no catalog / no LLM / no network. Imported by functions/api/feedback.js
// to turn a free-text printer mention typed into the WRONG form (general feedback
// / feature request / bug report) into STRUCTURED { brand?, model } the Printer
// Intake Scout's mapFields() can actually consume — so a wrong-form printer
// request becomes an actionable intake candidate instead of being silently
// dropped (S2 "Scout finding 2"). Keeping the structuring in the WORKER keeps the
// Scout deterministic + in-contract (it never does free-text judgment).
//
// The extraction IS the precision gate. Tier-1 fires on a known FDM brand or
// family token (high precision). Tier-2 (research-capable screening, 2026-06-20)
// adds brand-LESS capture for real brands we don't list yet: it fires ONLY when a
// request-intent trigger co-occurs with a STRICT digit-bearing model shape, and
// rejects platform / accessory / auth / material noun classes. A bare number-shape
// ("Error 500") never fires on its own; BRAND RESOLUTION for a brand-less hit is
// deferred to the Printer Addition Assistant — never done here, never in the Scout.
//
// TOKEN-LIST DEBT → S3: these brand/family/stop lists are a MINIMAL self-contained
// copy (the Worker can't read the Scout's scripts/printer-intake-guardrails.json
// at runtime — different runtime). S3 externalises the shared signal data into the
// versioned guardrails config; until then this list is intentionally small and is
// the documented dedupe debt handed to S3 (spec §8 risk 4).

// Known FDM brands (lowercased, whole-token).
const BRAND_TOKENS = new Set([
  // Catalog brands (mirror data/printers.json brands[]):
  'bambu', 'bambulab', 'creality', 'prusa', 'anycubic', 'elegoo', 'sovol',
  'qidi', 'flashforge', 'artillery', 'anker', 'ankermake', 'voron', 'voxelab',
  // Real FDM brands NOT yet in the catalog (intake exists to surface these).
  // Each is a verified FDM maker, whole-token, non-common-word. Common-word
  // brands (e.g. "Longer") are deliberately OMITTED to avoid false-firing on
  // prose — the Tier-2 intent path is their backstop. (Screening, 2026-06-20.)
  'snapmaker', 'kingroon', 'tronxy', 'twotrees', 'raise3d', 'ultimaker', 'weedo',
]);

// Known printer families (lowercased). The ambiguous short tokens (SHORT_FAMILY)
// fire ONLY with a STRONG adjacent model token (digit/variant) so they can't
// false-fire on prose. "mega" is deliberately NOT a family token — it's a common
// English intensifier ("mega useful"); a real "Anycubic Mega" resolves via the
// brand token instead.
const FAMILY_TOKENS = new Set(['ender', 'kobra', 'neptune', 'mk', 'sv', 'x1', 'p1', 'a1']);
const SHORT_FAMILY  = new Set(['mk', 'sv', 'x1', 'p1', 'a1']);
// Known model-variant words — corroborate a SHORT_FAMILY token so "X1 Carbon" /
// "A1 mini" fire but "X1 Export" / "A1 Sauce" / "MK Ultra" do not.
const MODEL_VARIANTS = new Set(['carbon', 'pro', 'max', 'plus', 'mini', 'neo', 'combo', 'lite', 'se', 'ke', 'ce']);

// Words that END a model span — common prose/stop words. A model token must be
// model-like (capitalised or digit-bearing); these are extra guards for the rare
// capitalised stop word.
const STOP_WORDS = new Set([
  'is', 'isnt', 'are', 'was', 'the', 'a', 'an', 'please', 'add', 'support',
  'adding', 'missing', 'in', 'on', 'of', 'to', 'my', 'your', 'our', 'and', 'or',
  'but', 'not', 'great', 'love', 'like', 'want', 'need', 'would', 'can', 'you',
  'this', 'that', 'it', 'its', 'list', 'app', 'also', 'too', 'really', 'very',
  'prints', 'print', 'printer', 'printers', 'available', 'soon', 'thanks', 'thank',
]);

// Resin / non-FDM keywords — a model span must STOP before any of these so a resin
// word can never enter the teed span and trip the Scout's fdmDecline into a false
// `declined-non-fdm` (spec §8 risk 7). Mirrors the Scout's non-FDM keyword set.
const RESIN_STOP = new Set([
  'resin', 'msla', 'sla', 'dlp', 'sls', 'mjf', 'photon', 'saturn', 'mars',
  'halot', 'sonic', 'phrozen', 'formlabs', 'jupiter', 'mighty', 'proxima',
  'shuffle', 'nova3d', 'peopoly', 'mono',
]);

// ── Tier-2 (research-capable screening, 2026-06-20): brand-less intent capture ──
// When NO known brand/family token is present, a printer request can still name a
// real brand we have never listed ("would love the Creator 5 pro"). Tier-2 fires
// ONLY when a request-intent trigger co-occurs with a STRICT digit-bearing model
// shape, and rejects non-printer noun classes. Brand resolution is the Assistant's
// job — never here.
const INTENT_SINGLE = /\b(add|adds|adding|support|supports|missing|want|wants|wish|wishes|need|needs)\b/;
const INTENT_PHRASES = [
  'would love', 'please add', 'not listed', 'isnt listed', 'cant find',
  'do you have', 'can you add', 'could you add', 'add support for',
];
// Non-printer noun classes that must NEVER become a brand-less capture even with a
// digit (platforms / accessories+parts / auth / materials). Whole-token, normalised.
const DENY_TERMS = new Set([
  // platforms
  'iphone', 'ipad', 'ipod', 'applewatch', 'apple', 'watch', 'android', 'windows',
  'macos', 'mac', 'linux', 'ios', 'ipados', 'samsung', 'galaxy', 'pixel',
  // accessories / parts
  'nozzle', 'ams', 'hotend', 'bed', 'hotbed', 'plate', 'buildplate', 'spool',
  'filament', 'extruder', 'belt', 'screen', 'psu', 'mainboard',
  // auth / security
  '2fa', 'mfa', 'otp', 'sso', 'password', 'login',
  // materials
  'pla', 'petg', 'abs', 'asa', 'tpu', 'pc', 'pa', 'nylon', 'pva', 'hips', 'pet', 'pctg', 'ppa', 'tpe',
  // generic / software nouns that pair with a number but are never a printer model
  'model', 'version', 'firmware', 'update',
]);

const MAX_MODEL_TOKENS = 3;       // tight span: brand/family + up to 3 model tokens
const MAX_SPAN_CHARS   = 160;     // bounded notes (PII minimisation, spec §4.1)

const normTok = (t) => String(t == null ? '' : t).toLowerCase().replace(/[^a-z0-9]/g, '');
// A model token is one we'll fold into the span: alphanumeric AND model-like
// (digit-bearing, or capitalised/all-caps like a model name) AND not a stop/resin
// word AND not PII (an email or long phone-like number). This keeps lowercase
// prose ("makes", "great") and contact info out while keeping real model names
// ("Aries", "SV08", "MK4S", "Max").
function isModelToken(orig) {
  const s = String(orig == null ? '' : orig);
  if (s.includes('@')) return false;                // never let an email token into the stored span (PII)
  const n = normTok(s);
  if (!n) return false;
  if (/^\d{5,}$/.test(n)) return false;             // long pure-number (phone-like) — not a model id, PII risk
  // resin / non-FDM word, INCLUDING a digit-fused variant (mars3 / saturn4 /
  // photon2) — must never enter the span or it would trip the Scout's fdmDecline.
  if (STOP_WORDS.has(n) || RESIN_STOP.has(n) || RESIN_STOP.has(n.replace(/\d+$/, ''))) return false;
  if (/[0-9]/.test(n)) return true;                 // digit-bearing (SV08, V3, X1)
  if (MODEL_VARIANTS.has(n)) return true;           // known variant word, any case ("mini", "Carbon")
  return /^[A-Z]/.test(s);                           // capitalised model name (Aries, Max, Pro)
}

// Stronger predicate for SHORT_FAMILY corroboration: a digit-bearing or known
// model-variant token — never a bare capitalised word (kills "MK Ultra", "A1
// Sauce", "X1 Export", "P1 Dashboard", "SV Mode").
function isStrongModelToken(orig) {
  if (!isModelToken(orig)) return false;
  const n = normTok(orig);
  return /[0-9]/.test(n) || MODEL_VARIANTS.has(n);
}

// True when the text carries a printer-request intent (Tier-2 gate). Apostrophes
// are stripped so "isn't listed" / "can't find" match the apostrophe-free phrases.
function hasIntentTrigger(text) {
  const t = String(text == null ? '' : text).toLowerCase().replace(/['’]/g, '');
  return INTENT_SINGLE.test(t) || INTENT_PHRASES.some((p) => t.includes(p));
}

// Scan ONE text value for a Tier-1 brand/family mention. Returns { brand?, model, span } | null.
// Tokenises on whitespace + hyphen/slash so "Ender-3 V3 KE" → [Ender,3,V3,KE].
function extractFromText(text) {
  const tokens = String(text == null ? '' : text).split(/[\s\-/]+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const n = normTok(tokens[i]);
    if (!n) continue;
    const isBrand = BRAND_TOKENS.has(n);
    const isFamily = FAMILY_TOKENS.has(n);
    if (!isBrand && !isFamily) continue;

    // gather up to MAX_MODEL_TOKENS following model tokens
    const following = [];
    for (let j = i + 1; j < tokens.length && following.length < MAX_MODEL_TOKENS; j++) {
      if (!isModelToken(tokens[j]) || DENY_TERMS.has(normTok(tokens[j]))) break;   // stop at prose/resin/non-model/material
      following.push(tokens[j]);
    }

    // SHORT_FAMILY tokens fire ONLY with a STRONG adjacent model token (digit or
    // known variant) — never a bare capitalised word — so "X1 Carbon" / "MK 4"
    // fire but "X1 Export" / "A1 Sauce" / "MK Ultra" / a stray "sv" do not.
    if (isFamily && SHORT_FAMILY.has(n) && (following.length === 0 || !isStrongModelToken(following[0]))) continue;

    if (isBrand) {
      const model = following.join(' ');
      const span = [tokens[i], ...following].join(' ').slice(0, MAX_SPAN_CHARS);
      return { brand: tokens[i], model, span };       // model may be '' → Scout → incomplete
    }
    // family: no explicit brand; model includes the family token itself so the
    // Scout's familyToBrand / globalModelIndex can resolve it.
    const model = [tokens[i], ...following].join(' ');
    const span = model.slice(0, MAX_SPAN_CHARS);
    return { model, span };
  }
  return null;
}

// A Tier-2 run member: a model token that is NOT a denied non-printer noun.
// Denied tokens (accessories / platforms / materials / generic) BREAK a run rather
// than being folded into it — so "AMS Creator 5 Pro" still captures "Creator 5 Pro"
// (the accessory mention doesn't poison the real model), and "iPhone 16 Pro" /
// "Model 3" never form a printer-shaped run.
function isRunMember(t) {
  return isModelToken(t) && !DENY_TERMS.has(normTok(t));
}

// Tier-2: brand-less request capture. Returns { model, span, intent } | null.
// Fires only when (1) a request-intent trigger is present AND (2) a maximal run of
// run-members (≤ MAX_MODEL_TOKENS) starts with a LETTER-bearing token and contains
// BOTH a digit-bearing token and a letter-bearing token — so "Creator 5 Pro" /
// "Anolca 7X" fire, but "5 Pro" / "16 Pro" (digit head) / "Night Mode" (no digit) /
// "AMS 2 Pro" (deny) do not. The brand is intentionally left unknown; the Printer
// Addition Assistant resolves it via research. Some non-printer brand+model devices
// (e.g. "GoPro Hero 11") are an accepted residual — the research step rejects them.
function extractBrandlessIntent(text) {
  if (!hasIntentTrigger(text)) return null;
  const tokens = String(text == null ? '' : text).split(/[\s\-/]+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    if (!isRunMember(tokens[i])) continue;
    let j = i;
    const run = [];
    while (j < tokens.length && run.length < MAX_MODEL_TOKENS && isRunMember(tokens[j])) { run.push(tokens[j]); j++; }
    const startsWithLetter = /[a-z]/.test(normTok(run[0]));        // model name has a letter head ("Creator 5", not "5 Pro")
    const hasDigit = run.some((t) => /[0-9]/.test(normTok(t)));
    const hasAlpha = run.some((t) => /[a-z]/.test(normTok(t)));
    if (startsWithLetter && hasDigit && hasAlpha) {
      const model = run.join(' ');
      return { model, span: model.slice(0, MAX_SPAN_CHARS), intent: 'unresolved-brand' };
    }
    i = j - 1;   // continue from the first token after this run (the i++ makes it j)
  }
  return null;
}

// Public: scan a feedback `fields` array (each { label, value }) for the first
// printer mention in any field VALUE. Per-field scan (never concatenates across
// fields, so a brand in one field can't merge with a number in another). Tier-1
// (brand/family) is tried first across all fields; Tier-2 (brand-less intent) only
// if Tier-1 found nothing. Returns { brand?, model, span, intent? } | null.
export function extractPrinterMention(fields) {
  const arr = Array.isArray(fields) ? fields : [];
  for (const f of arr) {
    const value = (f && typeof f.value === 'string') ? f.value : '';
    if (!value) continue;
    const hit = extractFromText(value);
    if (hit) return hit;
  }
  for (const f of arr) {
    const value = (f && typeof f.value === 'string') ? f.value : '';
    if (!value) continue;
    const hit = extractBrandlessIntent(value);
    if (hit) return hit;
  }
  return null;
}

// Exported for tests only.
export const _internals = {
  extractFromText, extractBrandlessIntent, hasIntentTrigger, isModelToken,
  BRAND_TOKENS, FAMILY_TOKENS, SHORT_FAMILY, RESIN_STOP, DENY_TERMS, MAX_SPAN_CHARS,
};
