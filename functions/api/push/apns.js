const encoder = new TextEncoder();

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function pemToBytes(pem) {
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  if (!base64) throw new Error("APNs private key is unavailable");
  try {
    return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  } catch {
    throw new Error("APNs private key is invalid");
  }
}

async function createProviderJWT(credentials, issuedAt) {
  const header = base64Url(
    encoder.encode(JSON.stringify({ alg: "ES256", kid: credentials.keyId })),
  );
  const claims = base64Url(
    encoder.encode(JSON.stringify({ iss: credentials.teamId, iat: issuedAt })),
  );
  const signingInput = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(credentials.privateKeyPEM),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      encoder.encode(signingInput),
    ),
  );
  return `${signingInput}.${base64Url(signature)}`;
}

export function buildAPNsRequest({
  environment,
  tokenHex,
  payload,
  jwt,
  topic,
  nowEpochSeconds,
}) {
  const host =
    environment === "development"
      ? "https://api.sandbox.push.apple.com"
      : "https://api.push.apple.com";
  return new Request(`${host}/3/device/${tokenHex}`, {
    method: "POST",
    headers: {
      Authorization: `bearer ${jwt}`,
      "Content-Type": "application/json",
      "apns-topic": topic,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-expiration": String(nowEpochSeconds + 3600),
      "apns-collapse-id": payload.announcement_id,
    },
    body: JSON.stringify(payload),
  });
}

export async function classifyAPNsResponse(response) {
  let reason = null;
  if (response.status < 200 || response.status >= 300) {
    try {
      const body = await response.json();
      reason = typeof body?.reason === "string" ? body.reason : null;
    } catch {
      reason = null;
    }
  }
  if (response.status >= 200 && response.status < 300) {
    return { classification: "accepted", status: response.status, reason: null };
  }
  if (
    response.status === 410 ||
    reason === "BadDeviceToken" ||
    reason === "DeviceTokenNotForTopic"
  ) {
    return { classification: "invalid", status: response.status, reason };
  }
  if (response.status === 403) {
    return { classification: "blocked", status: response.status, reason };
  }
  if (response.status === 429 || response.status >= 500) {
    return { classification: "retryable", status: response.status, reason };
  }
  return { classification: "failed", status: response.status, reason };
}

export function createAPNsClient({
  fetchImpl = fetch,
  nowEpochSeconds = () => Math.floor(Date.now() / 1000),
} = {}) {
  let cachedJWT = null;
  let cachedAt = 0;
  let cachedCredentialKey = null;

  return {
    async send({ credentials, environment, tokenHex, payload }) {
      const now = nowEpochSeconds();
      const credentialKey = `${credentials.keyId}:${credentials.teamId}`;
      if (
        !cachedJWT ||
        cachedCredentialKey !== credentialKey ||
        now - cachedAt >= 50 * 60
      ) {
        cachedJWT = await createProviderJWT(credentials, now);
        cachedAt = now;
        cachedCredentialKey = credentialKey;
      }
      const request = buildAPNsRequest({
        environment,
        tokenHex,
        payload,
        jwt: cachedJWT,
        topic: credentials.topic,
        nowEpochSeconds: now,
      });
      try {
        return await classifyAPNsResponse(await fetchImpl(request));
      } catch {
        return { classification: "retryable", status: null, reason: "transport" };
      }
    },
  };
}

export async function sendAPNs(client, input) {
  return client.send(input);
}
