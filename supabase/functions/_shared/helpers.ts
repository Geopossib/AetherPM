// Shared helpers imported by every Edge Function in this project.
// Deno-native (no npm install step) using the AWS SigV4 signer from
// esm.sh, which works against any S3-compatible endpoint including
// Contabo's -- Contabo Object Storage speaks the S3 API, so nothing
// AWS-specific here is actually AWS.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Service-role client: bypasses RLS, used ONLY inside Edge Functions,
// never sent to or usable by the desktop app.
export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// Verifies the caller's JWT (passed through from the Authorization
// header) and returns their user id, or null if it doesn't check out.
export async function requireUser(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

// Contabo Object Storage client, configured via environment variables
// set in the Supabase Edge Function secrets (never in client code).
export function contaboClient() {
  return new AwsClient({
    accessKeyId: Deno.env.get("CONTABO_ACCESS_KEY")!,
    secretAccessKey: Deno.env.get("CONTABO_SECRET_KEY")!,
    service: "s3",
    region: Deno.env.get("CONTABO_REGION") ?? "eu2",
  });
}

export function contaboEndpoint(): string {
  // e.g. https://eu2.contabostorage.com/<your-bucket-name>
  return Deno.env.get("CONTABO_ENDPOINT")!;
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
