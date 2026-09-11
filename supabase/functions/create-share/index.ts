// POST /create-share
// Body: { objectKey: string, projectName: string, recipientEmail?: string, expiresInDays?: number }
// Returns: { shareCode: string, expiresAt: string }

import { corsHeaders, jsonResponse, requireUser, serviceClient } from "../_shared/helpers.ts";

function randomShareCode(): string {
  // Short, human-typeable code (e.g. "7K2M-9QXP") rather than a raw UUID,
  // since a person may need to read this over chat or type it in by hand.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part()}-${part()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const userId = await requireUser(req);
  if (!userId) return jsonResponse({ error: "unauthorized" }, 401);

  const { objectKey, projectName, recipientEmail, expiresInDays } = await req.json();
  if (!objectKey || !projectName || !objectKey.startsWith(`projects/${userId}/`)) {
    return jsonResponse({ error: "invalid request" }, 400);
  }

  const supabase = serviceClient();
  const shareCode = randomShareCode();
  const expiresAt = new Date(Date.now() + (expiresInDays ?? 14) * 86_400_000).toISOString();

  const { error } = await supabase.from("shares").insert({
    owner_id: userId,
    object_key: objectKey,
    project_name: projectName,
    recipient_email: recipientEmail ?? null,
    share_code: shareCode,
    expires_at: expiresAt,
  });

  if (error) return jsonResponse({ error: error.message }, 500);

  return jsonResponse({ shareCode, expiresAt });
});
