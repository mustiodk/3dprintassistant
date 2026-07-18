export const MAX_REQUEST_BODY_BYTES = 4096;

const REGISTRATION_FIELDS = new Set([
  "schema_version",
  "token",
  "previous_token",
  "environment",
  "topics",
  "app_version",
  "build_number",
]);
const UNREGISTRATION_FIELDS = new Set([
  "schema_version",
  "token",
  "environment",
]);
const TOPIC_MASKS = Object.freeze({ new_printers: 1, app_updates: 2 });
const ENVIRONMENTS = new Set(["development", "production"]);
const TOKEN_PATTERN = /^(?:[0-9a-f]{2})+$/;
const APP_VERSION_PATTERN = /^[0-9]+(?:\.[0-9]+){0,3}$/;
const BUILD_NUMBER_PATTERN = /^[0-9]{1,32}$/;

export class ContractError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ContractError";
    this.status = status;
  }
}

function assertPlainObject(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new ContractError("body must be a JSON object");
  }
}

function assertExactFields(body, allowed) {
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) {
      throw new ContractError(`${key} is not allowed`);
    }
  }
}

function parseSchemaVersion(body) {
  if (body.schema_version !== 1) {
    throw new ContractError("schema_version must be 1");
  }
}

function parseToken(value, field = "token") {
  if (typeof value !== "string" || !TOKEN_PATTERN.test(value)) {
    throw new ContractError(`${field} must be non-empty even lowercase hex`);
  }
  return value;
}

function parseEnvironment(value) {
  if (!ENVIRONMENTS.has(value)) {
    throw new ContractError("environment must be development or production");
  }
  return value;
}

function parseTopics(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 2) {
    throw new ContractError("topics must contain at least one allowed topic");
  }
  const unique = new Set(value);
  if (unique.size !== value.length || value.some((topic) => !(topic in TOPIC_MASKS))) {
    throw new ContractError("topics must contain unique new_printers/app_updates values");
  }
  const topics = Object.keys(TOPIC_MASKS).filter((topic) => unique.has(topic));
  return {
    topics,
    topicsMask: topics.reduce((mask, topic) => mask | TOPIC_MASKS[topic], 0),
  };
}

export function parseRegistration(body) {
  assertPlainObject(body);
  assertExactFields(body, REGISTRATION_FIELDS);
  parseSchemaVersion(body);
  const { topics, topicsMask } = parseTopics(body.topics);
  if (
    typeof body.app_version !== "string" ||
    body.app_version.length > 32 ||
    !APP_VERSION_PATTERN.test(body.app_version)
  ) {
    throw new ContractError("app_version is invalid");
  }
  if (
    typeof body.build_number !== "string" ||
    !BUILD_NUMBER_PATTERN.test(body.build_number)
  ) {
    throw new ContractError("build_number is invalid");
  }

  return {
    tokenHex: parseToken(body.token),
    ...(body.previous_token === undefined
      ? {}
      : { previousTokenHex: parseToken(body.previous_token, "previous_token") }),
    environment: parseEnvironment(body.environment),
    topics,
    topicsMask,
    appVersion: body.app_version,
    buildNumber: body.build_number,
  };
}

export function parseUnregistration(body) {
  assertPlainObject(body);
  assertExactFields(body, UNREGISTRATION_FIELDS);
  parseSchemaVersion(body);
  return {
    tokenHex: parseToken(body.token),
    environment: parseEnvironment(body.environment),
  };
}

export async function readBoundedRawBody(request) {
  const declaredLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) {
    throw new ContractError(`request body exceeds ${MAX_REQUEST_BODY_BYTES} bytes`, 413);
  }
  if (request.body === null) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_REQUEST_BODY_BYTES) {
      await reader.cancel();
      throw new ContractError(`request body exceeds ${MAX_REQUEST_BODY_BYTES} bytes`, 413);
    }
    chunks.push(value);
  }

  const rawBody = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    rawBody.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return rawBody;
}

export function parseJsonBytes(rawBody) {
  try {
    return JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    throw new ContractError("body must be valid JSON");
  }
}

export async function readBoundedJson(request) {
  return parseJsonBytes(await readBoundedRawBody(request));
}

export function topicsForMask(mask) {
  return Object.entries(TOPIC_MASKS)
    .filter(([, bit]) => (mask & bit) !== 0)
    .map(([topic]) => topic);
}
