-- Phase 7: tags, plus what global search / activity feed / attachments
-- need is already covered by existing tables (tasks, requirements,
-- activity_events, attachments) - only tags are new.

ALTER TABLE tasks ADD COLUMN tags TEXT; -- comma-separated, kept simple for v1
