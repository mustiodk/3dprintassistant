import { topicsForMask } from "./contracts.js";
import { decodeEncryptionKey } from "./crypto.js";
import { registerDevice, unregisterDevice } from "./repository.js";

async function permitRegistration(request, env) {
  if (env.PUSH_TEST_RATE_LIMIT_BYPASS === "true") return true;
  if (!env.PUSH_REGISTRATION_RATE_LIMITER?.limit) return false;
  const result = await env.PUSH_REGISTRATION_RATE_LIMITER.limit({
    key: request.headers.get("CF-Connecting-IP") || "unknown",
  });
  return result.success;
}

export async function processRegistration(request, env, input) {
  if (env.PUSH_REGISTRATION_ENABLED !== "true") {
    return Response.json(
      { error: "push registration is unavailable" },
      { status: 503 },
    );
  }
  if (!(await permitRegistration(request, env))) {
    const missingBinding = !env.PUSH_REGISTRATION_RATE_LIMITER?.limit;
    return Response.json(
      { error: missingBinding ? "push registration is unavailable" : "rate limited" },
      { status: missingBinding ? 503 : 429 },
    );
  }
  let keyBytes;
  try {
    keyBytes = decodeEncryptionKey(env.PUSH_TOKEN_ENCRYPTION_KEY_V1);
  } catch {
    return Response.json(
      { error: "push registration is unavailable" },
      { status: 503 },
    );
  }
  const result = await registerDevice(env, input, { keyBytes });
  return Response.json({
    notification_id: result.notificationId,
    topics: topicsForMask(result.topics),
  });
}

export async function processUnregistration(env, input) {
  return Response.json(await unregisterDevice(env, input));
}
