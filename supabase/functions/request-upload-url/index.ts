// POST /request-upload-url
// Body: { fileName: string, declaredSizeBytes: number }
// Returns: { uploadUrl: string, objectKey: string } or a 403 if quota
// would be exceeded.
//
// The declared size is a client-supplied hint used only to reject
// obviously-oversized requests early and give a fast, clear error.
// The real enforcement happens in confirm-upload, which checks the
// object's actual size on Contabo after the fact -- never trust a
// client-reported size for the number that actually gets billed.

import { corsHeaders, jsonResponse, requireUser, serviceClient, contaboClient, contaboEndpoint } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const userId = await requireUser(req);
  if (!userId) return jsonResponse({ error: "unauthorized" }, 401);

  const { fileName, declaredSizeBytes } = await req.json();
  if (!fileName || typeof declaredSizeBytes !== "number") {
    return jsonResponse({ error: "fileName and declaredSizeBytes are required" }, 400);
  }

  const supabase = serviceClient();
  const { data: usage, error: usageError } = await supabase
    .from("storage_usage")
    .select("used_bytes, limit_bytes")
    .eq("user_id", userId)
    .single();

  if (usageError || !usage) return jsonResponse({ error: "could not load storage usage" }, 500);

  if (usage.used_bytes + declaredSizeBytes > usage.limit_bytes) {
    return jsonResponse(
      {
        error: "storage_quota_exceeded",
        used_bytes: usage.used_bytes,
        limit_bytes: usage.limit_bytes,
        message: "This upload would exceed your storage plan. Free up space or upgrade to Pro.",
      },
      403
    );
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectKey = `projects/${userId}/${crypto.randomUUID()}-${safeName}`;

  const client = contaboClient();
  const url = new URL(`${contaboEndpoint()}/${objectKey}`);
  url.searchParams.set("X-Amz-Expires", "300"); // 5-minute presigned window

  const signed = await client.sign(
    new Request(url, { method: "PUT" }),
    { aws: { signQuery: true } }
  );

  return jsonResponse({ uploadUrl: signed.url, objectKey });
});
