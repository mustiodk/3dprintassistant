const encoder = new TextEncoder();
const MAX_CLOCK_SKEW_SECONDS = 300;

export class AuthError extends Error {
  constructor(message = "request authentication failed") {
    super(message);
    this.name = "AuthError";
    this.status = 401;
  }
}

function concatBytes(left, right) {
  const bytes = new Uint8Array(left.byteLength + right.byteLength);
  bytes.set(left, 0);
  bytes.set(right, left.byteLength);
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function signRegistrationBody(secret, timestamp, rawBody) {
  if (typeof secret !== "string" || secret.length === 0) {
    throw new AuthError("request authentication is unavailable");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const message = concatBytes(encoder.encode(`${timestamp}\n`), rawBody);
  return bytesToBase64(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, message)),
  );
}

export async function constantTimeEqual(
  left,
  right,
  compare = crypto.subtle.timingSafeEqual.bind(crypto.subtle),
) {
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  return compare(leftDigest, rightDigest);
}

export async function verifySignedRequest(
  { timestamp, signature, rawBody },
  secret,
  nowMs = Date.now(),
) {
  if (!/^[0-9]{1,20}$/.test(timestamp ?? "") || typeof signature !== "string") {
    throw new AuthError();
  }
  const timestampSeconds = Number(timestamp);
  const nowSeconds = Math.floor(nowMs / 1000);
  if (
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS
  ) {
    throw new AuthError();
  }
  const expected = await signRegistrationBody(secret, timestamp, rawBody);
  if (!(await constantTimeEqual(signature, expected))) {
    throw new AuthError();
  }
}

export async function authenticateRequest(request, rawBody, secret, nowMs = Date.now()) {
  return verifySignedRequest(
    {
      timestamp: request.headers.get("X-3DPA-Timestamp"),
      signature: request.headers.get("X-3DPA-Signature"),
      rawBody,
    },
    secret,
    nowMs,
  );
}
