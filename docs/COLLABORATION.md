# Collaboration Architecture

This document explains how AetherPM handles collaboration today (v1,
local-only) and the plan for adding real multi-device, multi-user sync
later, without a rewrite.

## Where things stand in v1

Everything lives in one SQLite file on one machine. There is no server,
no accounts, no network calls for app data. "Collaboration" in this
version means:

- **Members & roles** (`project_members`, `users` tables) — you can add
  named people to a project and assign them Owner/Admin/Editor/Viewer,
  and use them as task assignees or comment authors. This is bookkeeping,
  not access control: there's no login, so it doesn't stop anyone using
  the app from doing anything. Roles exist now so the *data model and
  UI* are already role-aware — enforcing them is a Phase 5+ item once
  there's a real identity to check against.
- **Comments & mentions** (`comments`, `notifications` tables) — typing
  `@Name` in a comment creates a notification for that member. Since
  everything is local, this is really "leave yourself a note tagged to
  a teammate" until sync exists — useful for a shared export/import
  workflow (see below), not yet real-time.
- **Activity feed** (`activity_events`) — every task/comment/etc write
  appends a row here, which is exactly the event log a sync engine
  would need later.

## Why the schema is already sync-ready

A few deliberate choices in the schema exist specifically so cloud sync
can be bolted on rather than requiring a migration that breaks existing
local databases:

- **All primary keys are UUID `TEXT`, not auto-increment integers.**
  Two machines can generate ids offline without colliding.
- **`project_members` already models multi-user membership** the same
  shape a server-backed system would use (a join table with a role),
  so the client code that reads/writes membership doesn't change when
  a real backend exists — only where those rows come from does.
- **`activity_events` is an append-only log**, which doubles as the
  natural feed for "what changed since I was last online."

## The plan for real sync (future phase)

1. **Add a `sync_cursor` table**: one row per remote endpoint, storing
   the last-synced timestamp/version. On reconnect, the client asks the
   server for everything after that cursor.
2. **Add a thin sync service** (separate from this desktop app) that:
   - Accepts pushed rows from a client's local SQLite (batched by table)
   - Applies last-write-wins per row, using each row's existing
     `created_at`/an added `updated_at` for conflict resolution — simple
     to reason about, good enough for a PM tool where true concurrent
     edits to the same field are rare
   - Returns rows changed by other clients since the requesting
     client's cursor
3. **Introduce real accounts.** `users.email` already exists in the
   schema for this — today it's unused (local members are name-only).
   Login would populate it and let `user_id` mean something across
   machines instead of just within one local file.
4. **Make roles load-bearing.** Once there's a real identity, the
   existing `project_members.role` column starts actually gating
   writes (e.g. a Viewer's client refuses to call the mutating Tauri
   commands, and the sync service double-checks server-side).
5. **Presence** (who's viewing what right now) is the one piece with no
   local-only equivalent — it only makes sense once there's a live
   connection. It would be a lightweight websocket/pubsub layer on top
   of the sync service, not stored in SQLite at all.

## Stopgap for teams today: export/import

Until sync ships, `export_project` / `import_project` (JSON files) are
the real "share this project" mechanism: one person exports, sends the
file, a teammate imports it as a new local project. It's manual and
doesn't merge changes, but it means nothing about later real sync is
blocked on this — the export format is already close to what a sync
payload would look like.

## Mobile

The same SQLite schema and the same Rust validation logic (orphan
requirements, risk checks, etc. in `commands/validation.rs`) are meant
to be reused as a shared core crate, with a native or React Native UI
on top — mobile shouldn't need its own copy of the business rules.
