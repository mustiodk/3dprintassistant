import { AuthError, authenticateRequest } from "./auth.js";
import {
  CampaignError,
  authorizeAdmin,
  campaignStatus,
  cancelCampaign,
  createCampaign,
  previewCampaign,
  replayCampaignCursor,
} from "./campaigns.js";
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
const ADMIN_CREATE_PATH = "/api/push/admin/campaigns";
const ADMIN_CAMPAIGN_PATH =
  /^\/api\/push\/admin\/campaigns\/([a-z0-9][a-z0-9._-]{0,127})(?:\/(cancel|replay))?$/;

function jsonError(message, status) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function handlePushRequest(request, env) {
  const path = new URL(request.url).pathname;
  if (path === ADMIN_CREATE_PATH || ADMIN_CAMPAIGN_PATH.test(path)) {
    return handlePushAdminRequest(request, env);
  }
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

export function isPushAPIPath(path) {
  return (
    path === REGISTER_PATH ||
    path === UNREGISTER_PATH ||
    path === ADMIN_CREATE_PATH ||
    ADMIN_CAMPAIGN_PATH.test(path)
  );
}

export async function handlePushAdminRequest(request, env) {
  const path = new URL(request.url).pathname;
  try {
    await authorizeAdmin(request, env);
    if (path === ADMIN_CREATE_PATH) {
      if (request.method !== "POST") return jsonError("method not allowed", 405);
      const body = parseJsonBytes(await readBoundedRawBody(request));
      const hasCampaignConfirmation = body.confirm_campaign_id !== undefined;
      const hasDigestConfirmation = body.confirm_preview_digest !== undefined;
      if (hasCampaignConfirmation !== hasDigestConfirmation) {
        throw new CampaignError("both confirmation fields are required", 400);
      }
      const result = hasCampaignConfirmation
        ? await createCampaign(env, body)
        : await previewCampaign(env, body);
      return Response.json(result, {
        status: hasCampaignConfirmation ? 202 : 200,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const match = ADMIN_CAMPAIGN_PATH.exec(path);
    if (!match) return jsonError("not found", 404);
    const [, campaignId, action] = match;
    if (action === undefined && request.method === "GET") {
      return Response.json(await campaignStatus(env, campaignId), {
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (request.method !== "POST") return jsonError("method not allowed", 405);
    const result =
      action === "cancel"
        ? await cancelCampaign(env, campaignId)
        : action === "replay"
          ? await replayCampaignCursor(env, campaignId)
          : null;
    return result
      ? Response.json(result, { headers: { "Cache-Control": "no-store" } })
      : jsonError("method not allowed", 405);
  } catch (error) {
    if (error instanceof CampaignError || error instanceof ContractError) {
      return jsonError(error.message, error.status);
    }
    return jsonError("internal server error", 500);
  }
}
