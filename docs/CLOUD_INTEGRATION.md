# Cloud Integration: Supabase (Auth) + Contabo (Storage)

This document is the framework for turning AetherPM from a fully local
desktop app into one with optional cloud accounts, cloud project
sharing, and a metered free/paid tier — without running your own
backend server.

**The core design decision: no VPS, no custom server.** Supabase Auth
handles identity, Supabase Postgres holds a small amount of metadata
(who owns what, how much storage they've used), Supabase Edge Functions
act as the one trusted broker that's allowed to talk to Contabo, and
Contabo Object Storage holds the actual bytes. This answers your
earlier VPS question directly: you don't need one. Everything below
runs on free or near-free managed tiers.

---

## 1. Why you can't just embed Contabo credentials in the app

The tempting shortcut — put a Contabo access key + secret in the
desktop app and let it upload/download directly — doesn't work safely
for a multi-tenant product. Contabo Object Storage issues one access
key per account, not one per end-user. If that key ships inside every
copy of AetherPM, any user can read or delete *any other user's*
files, and anyone who decompiles the app has full access to your
entire bucket. This isn't a theoretical risk — it's the single most
common way indie SaaS storage integrations get abused.

The fix is a **trusted broker**: something that holds the real Contabo
credentials, checks who's asking and what they're allowed to do, and
only then hands out a narrowly-scoped, time-limited **presigned URL**
good for one file, one operation (PUT or GET), expiring in minutes.
The desktop app never sees the real credentials — only a URL it can
use once.

That broker is Supabase Edge Functions (Deno, serverless, free tier
covers 500,000 invocations/month — see §6). This is also why Supabase
is doing more here than "just Auth": its Postgres database is where
you track *how much storage each user has used*, and Edge Functions
are where you *enforce* that limit before ever generating a URL.

---

## 2. Data flow

### Sign in
1. Desktop app calls Supabase Auth (`/auth/v1/token`, `/auth/v1/signup`)
   directly over HTTPS — no custom backend needed, Supabase's REST API
   is the backend for this part.
2. The returned access token (JWT) + refresh token are stored in the
   OS keychain (via the Rust `keyring` crate) — not in a plaintext
   file, not in SQLite.
3. Every subsequent cloud call attaches the JWT as a Bearer token.

### Uploading a project (sharing to the cloud)
1. App calls Edge Function `request-upload-url` with the JWT and the
   file's declared size.
2. The function verifies the JWT (Supabase does this automatically —
   `context.auth.uid()` is only populated for valid tokens), looks up
   `storage_usage` for that user in Postgres, and checks
   `used_bytes + declared_size <= plan_limit_bytes`.
3. If it fits, the function signs a presigned **PUT** URL scoped to
   the object key `projects/{user_id}/{uuid}.json`, expiring in 5
   minutes, and returns it.
4. The app PUTs the export file straight to Contabo using that URL —
   the bytes never pass through Supabase at all, keeping Edge Function
   compute cheap regardless of file size.
5. App calls `confirm-upload` with the object key. This function does
   a `HEAD` request against Contabo to read the *actual* uploaded size
   (never trust the client's declared size), updates `storage_usage`,
   and — this matters — if the real size blew past quota (a client
   could lie in step 1), deletes the object and returns an error.

### Sharing with another person
1. Owner calls `create-share` with the object key and either an email
   or "anyone with the code."
2. Function inserts a row into `shares` (owner, object key, optional
   recipient email, expiry — default 14 days) and returns a short
   share code.
3. Recipient enters the code (or, if invited by email, sees it under
   "Shared with me" automatically — enforced via Postgres Row Level
   Security, not app logic, so there's no way to see someone else's
   shares even with a bug in the client).
4. On import, the app calls `list-shares` to resolve the code to an
   object key, then a second Edge Function issues a presigned **GET**
   URL, and the app downloads and calls the existing `import_project`
   Rust command. Nothing new needed on the import side — it reuses
   Phase 1 code.

### Why this stays cheap as you grow
The expensive part of any file-sharing feature is usually egress
(data leaving the provider) and API request fees. Contabo Object
Storage's flat per-GB rate with no metered egress or request fees
(confirm this still holds at contabo.com/en/object-storage before
launch — pricing pages change) means your cost scales with *storage
volume*, not *how often people share files*. That's the right cost
shape for a PM tool where sharing happens occasionally but the app is
used constantly.

---

## 3. Why local-only usage stays completely free

None of this touches the local SQLite experience. Project members,
comments, tasks, requirements, diagrams — everything built in Phases
1–7 — keeps working with zero network calls and zero cost, cloud
account or not. Cloud sign-in only gates two things: syncing a project
to the cloud, and cloud-based sharing. Someone who never creates an
account loses nothing except those two features; they can still use
the JSON export/import file-on-disk flow that already exists.

---

## 4. Database schema (Supabase Postgres)

Three tables, all covered by Row Level Security so a user can only see
their own rows (see `supabase/schema.sql` for the exact SQL):

- **`profiles`** — one row per user (mirrors `auth.users`), holds
  `plan` (`free` | `pro`) and `plan_renewed_at`.
- **`storage_usage`** — one row per user, `used_bytes`, `limit_bytes`.
  Updated only by Edge Functions (never directly by the client), so a
  compromised or buggy client can't grant itself more quota.
- **`shares`** — one row per shared file: `owner_id`, `object_key`,
  `recipient_email` (nullable), `share_code`, `expires_at`.

---

## 5. Free vs. Pro — and the actual cost math behind it

Your instruction was: every feature stays free, only cloud storage is
metered, and Pro should be priced from real numbers rather than a
guess. Here's that math, using Contabo's published flat rate of
**€2.49 / 250 GB / month** (≈ **$0.0108 per GB/month** at a rough
€1 ≈ $1.08 conversion — reconfirm both the EUR price and the exchange
rate before you finalize pricing, since either can drift).

**Key fact that shapes the whole model:** at that rate, storage cost
is close to irrelevant at the volumes an individual PM tool user
actually needs. A project export (JSON) for even a large, heavily-used
AetherPM project is typically hundreds of KB to a few MB — not
gigabytes. Real file attachments, if you later store the actual bytes
instead of local path references, are the only thing that meaningfully
grows this.

| | Free | Pro |
|---|---|---|
| Cloud storage quota | 500 MB | 10 GB |
| Cost to you if fully maxed | **$0.0054/mo** | **$0.108/mo** |
| Active cloud shares | 5 at a time, links expire in 14 days | Unlimited, links expire in 90 days (or never) |
| Everything else (Kanban, requirements, SysML, timeline, risks, decisions, comments, local collaboration) | Free, unlimited | Free, unlimited |

**What this means for pricing Pro:** at $0.108/month in raw storage
cost per fully-maxed Pro user, cost-plus pricing would suggest
charging almost nothing — the storage itself is not the expense worth
recovering. Two honest ways to think about a price point instead:

1. **Realistic aggregate cost at scale.** Even generously assuming
   10,000 free users each average 40% utilization of their 500 MB
   (200 MB actual) — which is already a pessimistic/high estimate for
   a tool that mostly stores small JSON exports — total storage is
   ~2 TB, costing **≈ $21.60/month** on Contabo. Supabase Auth is free
   to 50,000 MAU on every plan; Postgres storage for these three
   tables is a few hundred bytes per user, nowhere near the 500 MB
   free Postgres cap even at tens of thousands of users; Edge Function
   invocations (a handful per user action) stay well under the
   500,000/month free allotment until you have a genuinely large
   active user base. **Realistic conclusion: your infrastructure cost
   for thousands of free users is in the tens of dollars per month,
   not hundreds.**
2. **Market-rate pricing**, not cost recovery, is what should set the
   Pro price — the storage margin will be enormous regardless of what
   you charge, so the number should reflect what a prosumer/small-team
   PM tool add-on is worth to the person paying, not your infra bill.
   A **$4.99/month or $49/year** Pro tier is a defensible, low-friction
   entry point for this category — cheap enough to not need a sales
   conversation, high enough that a few hundred subscribers already
   covers infrastructure many times over. This is a product/market
   judgment call, not something I can calculate precisely for you —
   validate it against what your actual early users say they'd pay
   before locking it in.

**Bottom line:** you have enormous room here. Even if free-tier storage
abuse ran 5–10x higher than the estimate above, you're still looking
at double-digit monthly infrastructure cost. The thing to actually
budget attention for isn't the storage bill — it's building in a hard
per-user cap (already part of this design, enforced server-side in
`confirm-upload`) so no single account can run away with cost via a
scripted abuse case.

---

## 6. What's free vs. what eventually costs *you* money

| Service | Free tier ceiling | When you'd pay |
|---|---|---|
| Supabase Auth | 50,000 MAU | Past 50K MAU (Pro plan, $25/mo base) |
| Supabase Postgres | 500 MB | Realistically never, for this schema — 3 tiny tables |
| Supabase Edge Functions | 500,000 invocations/mo | High-thousands of daily active cloud users |
| Contabo Object Storage | N/A — no free tier, but flat-rate from €2.49/250GB | From byte one, but the per-user cost is fractions of a cent (§5) |

Practical read: you can run this entire cloud layer on Supabase's free
plan plus a single ~€2.49–10/month Contabo Object Storage subscription
for a meaningful base of users, only needing to add Contabo capacity
(in €2.49/250GB increments) as real usage grows — and Pro subscription
revenue should outpace that by a wide margin from very few paying
users.

---

## 7. What's implemented vs. what's a stub

This pass implements the real, working pieces:
- `supabase/schema.sql` — deployable schema + RLS policies
- `supabase/functions/*` — working Edge Functions for upload URL
  issuance, upload confirmation + quota enforcement, share creation,
  and share listing
- `src-tauri/src/cloud/` — Rust client for Supabase Auth and the
  upload/share flow, with new Tauri commands
- A minimal sign-in screen and a "Cloud" section in Settings showing
  storage usage and a "Share to cloud" action

What's intentionally left as a next step, not built yet:
- Billing/subscription handling for the Pro plan itself (Stripe or
  similar) — the `profiles.plan` column exists for it to write into,
  but no payment flow is wired up
- Real-time multi-device sync of local SQLite data — this cloud layer
  is share/relay, not live sync (see `docs/COLLABORATION.md` for what
  full sync would additionally require)
- Uploading real file attachment bytes (currently attachments remain
  local path references, as before)
