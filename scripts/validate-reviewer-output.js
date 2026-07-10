const ISO_8601 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/;
const REVIEWER_ID = /^[a-z0-9](?:[a-z0-9._-]{0,63})$/i;

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIso8601Timestamp(value) {
  if (!nonEmptyString(value)) return false;
  const match = ISO_8601.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText,
    fraction = '', zone] = match;
  if (zone !== 'Z') {
    const [offsetHour, offsetMinute] = zone.slice(1).split(':').map(Number);
    if (offsetHour > 23 || offsetMinute > 59) return false;
  }

  const normalized = `${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}:${secondText}`
    + `${fraction ? `.${fraction}` : ''}Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime()) || Number.isNaN(Date.parse(value))) return false;
  return parsed.getUTCFullYear() === Number(yearText)
    && parsed.getUTCMonth() + 1 === Number(monthText)
    && parsed.getUTCDate() === Number(dayText)
    && parsed.getUTCHours() === Number(hourText)
    && parsed.getUTCMinutes() === Number(minuteText)
    && parsed.getUTCSeconds() === Number(secondText);
}

function validateReviewerOutput(output) {
  const errors = [];
  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    return { ok: false, errors: ['output must be an object'] };
  }

  if (!nonEmptyString(output.reviewer) || !REVIEWER_ID.test(output.reviewer)) {
    errors.push('reviewer must be a stable non-whitespace token');
  }
  if (!['GO', 'NO-GO'].includes(output.verdict)) {
    errors.push('verdict must be GO or NO-GO');
  }
  if (!Array.isArray(output.objections)) {
    errors.push('objections must be an array');
  } else {
    if (output.verdict === 'GO' && output.objections.length !== 0) {
      errors.push('GO must have empty objections');
    }
    if (output.verdict === 'NO-GO' && output.objections.length === 0) {
      errors.push('NO-GO requires objections');
    }
    for (const [index, objection] of output.objections.entries()) {
      if (!objection || typeof objection !== 'object' || Array.isArray(objection)) {
        errors.push(`objections[${index}] must be an object`);
        continue;
      }
      if (!nonEmptyString(objection.field)) {
        errors.push(`objections[${index}].field is required`);
      }
      if (!nonEmptyString(objection.question)) {
        errors.push(`objections[${index}].question is required`);
      }
      if (!isIso8601Timestamp(objection.raisedAt)) {
        errors.push(`objections[${index}].raisedAt must be ISO-8601`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

module.exports = { isIso8601Timestamp, validateReviewerOutput };
