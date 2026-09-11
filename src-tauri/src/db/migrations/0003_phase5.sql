-- Phase 5: collaboration foundations.
-- The `users`, `project_members`, `comments`, and `notifications` tables
-- already exist from 0001_init.sql. This migration only adds what's
-- needed to make local multi-user actually usable in v1: a display name
-- column already covers users, so this just backfills a default local
-- user so every existing project has an Owner.

INSERT OR IGNORE INTO users (id, display_name, email, created_at)
VALUES ('local-user', 'You', NULL, datetime('now'));

INSERT OR IGNORE INTO project_members (id, project_id, user_id, role)
SELECT lower(hex(randomblob(16))), id, 'local-user', 'Owner' FROM projects
WHERE id NOT IN (SELECT project_id FROM project_members WHERE user_id = 'local-user');
