import { AuthError, authenticateRequest } from "./auth.js";
import {
  ContractError,
  parseJsonBytes,
  parseRegistration,
  parseUnregistration,
  readBoundedRawBody,
} from "./contracts.js";
import { processRegistration, processUnregistration } from "./registration.js";

const REGISTER_PATH = "/api/push/register";
const UNREGISTER_PATH = "/api/push/unregister";

function jsonError(message, status) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function handlePushRequest(request, env) {
  const path = new URL(request.url).pathname;
  if (path !== REGISTER_PATH && path !== UNREGISTER_PATH) {
    return jsonError("not found", 404);
  }
  if (request.method !== "POST") {
    return jsonError("method not allowed", 405);
  }

  try {
    const rawBody = await readBoundedRawBody(request);
    await authenticateRequest(
      request,
      rawBody,
      env.IOS_PUSH_REGISTRATION_SECRET,
    );
    const body = parseJsonBytes(rawBody);
    const response =
      path === REGISTER_PATH
        ? await processRegistration(request, env, parseRegistration(body))
        : await processUnregistration(env, parseUnregistration(body));
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    if (error instanceof ContractError || error instanceof AuthError) {
      return jsonError(error.message, error.status);
    }
    return jsonError("internal server error", 500);
  }
}
