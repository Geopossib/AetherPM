// GET /list-shares            -> shares the caller owns or was sent
// POST /list-shares { shareCode } -> resolves one code to a presigned download URL

import { corsHeaders, jsonResponse, requireUser, serviceClient, contaboClient, contaboEndpoint } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const userId = await requireUser(req);
  if (!userId) return jsonResponse({ error: "unauthorized" }, 401);

  const supabase = serviceClient();

  if (req.method === "GET") {
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;

    const { data, error } = await supabase
      .from("shares")
      .select("id, project_name, share_code, expires_at, created_at, owner_id")
      .or(`owner_id.eq.${userId}${email ? `,recipient_email.eq.${email}` : ""}`)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ shares: data });
  }

  // POST: resolve a share code to a one-time presigned GET URL.
  const { shareCode } = await req.json();
  if (!shareCode) return jsonResponse({ error: "shareCode is required" }, 400);

  const { data: share, error } = await supabase
    .from("shares")
    .select("object_key, project_name, expires_at")
    .eq("share_code", shareCode)
    .single();

  if (error || !share) return jsonResponse({ error: "share not found" }, 404);
  if (new Date(share.expires_at) < new Date()) return jsonResponse({ error: "this share link has expired" }, 410);

  const client = contaboClient();
  const url = new URL(`${contaboEndpoint()}/${share.object_key}`);
  url.searchParams.set("X-Amz-Expires", "300");
  const signed = await client.sign(new Request(url, { method: "GET" }), { aws: { signQuery: true } });

  return jsonResponse({ downloadUrl: signed.url, projectName: share.project_name });
});
