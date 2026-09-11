# Deploying the AetherPM cloud layer

This folder contains everything needed to add cloud accounts and cloud
project sharing to AetherPM, on top of a free Supabase project and a
Contabo Object Storage subscription. See `docs/CLOUD_INTEGRATION.md`
for the full design and the pricing math behind the free/Pro split.

## 1. Prerequisites

- A Supabase project (free tier is enough to start — supabase.com)
- A Contabo Object Storage subscription (from €2.49/250GB —
  contabo.com/en/object-storage), with a bucket created
- The [Supabase CLI](https://supabase.com/docs/guides/cli) installed
  locally: `npm install -g supabase`

## 2. Apply the database schema

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This runs `schema.sql`, creating `profiles`, `storage_usage`, `shares`,
their Row Level Security policies, and the trigger that auto-creates a
`profiles`/`storage_usage` row whenever someone signs up.

## 3. Set Edge Function secrets

These are **never** put in the desktop app — they live only in
Supabase's secret store and are read by the Edge Functions at runtime.

```bash
supabase secrets set CONTABO_ACCESS_KEY=your_contabo_access_key
supabase secrets set CONTABO_SECRET_KEY=your_contabo_secret_key
supabase secrets set CONTABO_ENDPOINT=https://eu2.contabostorage.com/your-bucket-name
supabase secrets set CONTABO_REGION=eu2
```

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected
automatically by Supabase for every Edge Function — you don't set
those yourself.)

## 4. Deploy the functions

```bash
supabase functions deploy request-upload-url
supabase functions deploy confirm-upload
supabase functions deploy create-share
supabase functions deploy list-shares
```

## 5. Configure the desktop app

The Tauri app needs to know your Supabase project URL and anon key
(the anon key is meant to be public — it's the RLS policies, not
secrecy, that protect data). Fill these into
`~/.local/share/aetherpm/cloud_config.toml` (created with a template
on first run of a build that includes the cloud module):

```toml
supabase_url = "https://your-project-ref.supabase.co"
supabase_anon_key = "your-anon-key"
```

## 6. Adjust the default free-tier quota

`storage_usage.limit_bytes` defaults to 500 MB (524288000) for new
signups, matching the Free plan described in
`docs/CLOUD_INTEGRATION.md`. To change it, edit the default in
`schema.sql` before first deploy, or update existing rows:

```sql
update storage_usage set limit_bytes = 524288000 where limit_bytes is null;
```

Upgrading a user to Pro (once you wire up billing) is two writes:

```sql
update profiles set plan = 'pro', plan_renewed_at = now() where id = '<user-id>';
update storage_usage set limit_bytes = 10737418240 where user_id = '<user-id>'; -- 10 GB
```
