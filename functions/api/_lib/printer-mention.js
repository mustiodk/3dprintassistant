// ─── Deterministic printer-mention extractor (S2) ────────────────────────────
//
// Pure ESM, no catalog / no LLM / no network. Imported by functions/api/feedback.js
// to turn a free-text printer mention typed into the WRONG form (general feedback
// / feature request / bug report) into STRUCTURED { brand?, model } the Printer
// Intake Scout's mapFields() can actually consume — so a wrong-form printer
// request becomes an actionable intake candidate instead of being silently
// dropped (S2 "Scout finding 2"). Keeping the structuring in the WORKER keeps the
// Scout deterministic + in-contract (it never does free-text judgment).
//
// The extraction IS the precision gate: it fires ONLY on a known FDM brand token
// or a known printer-family token. No brand/family token → null → don't tee. A
// bare number-shape ("Error 500", "version 2") never fires on its own.
//
// TOKEN-LIST DEBT → S3: these brand/family/stop lists are a MINIMAL self-contained
// copy (the Worker can't read the Scout's scripts/printer-intake-guardrails.json
// at runtime — different runtime). S3 externalises the shared signal data into the
// versioned guardrails config; until then this list is intentionally small and is
// the documented dedupe debt handed to S3 (spec §8 risk 4).

// Known FDM brands (lowercased, whole-token). Mirrors the Scout config brandTokens.
const BRAND_TOKENS = new Set([
  'bambu', 'bambulab', 'creality', 'prusa', 'anycubic', 'elegoo', 'sovol',
  'qidi', 'flashforge', 'artillery', 'anker', 'ankermake', 'voron', 'voxelab',
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

// Scan ONE text value for a printer mention. Returns { brand?, model, span } | null.
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
      if (!isModelToken(tokens[j])) break;            // stop at prose / resin / non-model
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

// Public: scan a feedback `fields` array (each { label, value }) for the first
// printer mention in any field VALUE. Per-field scan (never concatenates across
// fields, so a brand in one field can't merge with a number in another). Returns
// { brand?, model, span } | null.
export function extractPrinterMention(fields) {
  for (const f of (Array.isArray(fields) ? fields : [])) {
    const value = (f && typeof f.value === 'string') ? f.value : '';
    if (!value) continue;
    const hit = extractFromText(value);
    if (hit) return hit;
  }
  return null;
}

// Exported for tests only.
export const _internals = { extractFromText, isModelToken, BRAND_TOKENS, FAMILY_TOKENS, SHORT_FAMILY, RESIN_STOP, MAX_SPAN_CHARS };
