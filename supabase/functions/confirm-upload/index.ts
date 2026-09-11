// POST /confirm-upload
// Body: { objectKey: string }
// Returns: { ok: true, usedBytes: number } or deletes the object and
// returns 403 if the real uploaded size busted the user's quota --
// this is the check that actually matters, since request-upload-url
// only ever saw a client-reported size.

import { corsHeaders, jsonResponse, requireUser, serviceClient, contaboClient, contaboEndpoint } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const userId = await requireUser(req);
  if (!userId) return jsonResponse({ error: "unauthorized" }, 401);

  const { objectKey } = await req.json();
  if (!objectKey || !objectKey.startsWith(`projects/${userId}/`)) {
    return jsonResponse({ error: "invalid object key for this user" }, 400);
  }

  const client = contaboClient();
  const headUrl = `${contaboEndpoint()}/${objectKey}`;
  const headResp = await client.fetch(headUrl, { method: "HEAD" });
  if (!headResp.ok) return jsonResponse({ error: "object not found on storage" }, 404);

  const actualSize = parseInt(headResp.headers.get("Content-Length") ?? "0", 10);

  const supabase = serviceClient();
  const { data: usage } = await supabase
    .from("storage_usage")
    .select("used_bytes, limit_bytes")
    .eq("user_id", userId)
    .single();

  if (!usage) return jsonResponse({ error: "could not load storage usage" }, 500);

  if (usage.used_bytes + actualSize > usage.limit_bytes) {
    // The client lied about size in step 1, or a race let two uploads
    // through concurrently. Delete what just landed and reject.
    await client.fetch(headUrl, { method: "DELETE" });
    return jsonResponse({ error: "storage_quota_exceeded", message: "Upload exceeded your storage plan and was removed." }, 403);
  }

  const newUsed = usage.used_bytes + actualSize;
  await supabase.from("storage_usage").update({ used_bytes: newUsed, updated_at: new Date().toISOString() }).eq("user_id", userId);

  return jsonResponse({ ok: true, usedBytes: newUsed });
});
