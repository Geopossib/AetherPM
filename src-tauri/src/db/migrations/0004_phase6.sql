-- Phase 6: sprints/iterations mode + calendar support.
-- Calendar and saved-view filters use existing tables (tasks.due_date,
-- saved_views) so no schema change is needed for those.

CREATE TABLE IF NOT EXISTS sprints (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    start_date    TEXT,
    end_date      TEXT,
    status        TEXT NOT NULL DEFAULT 'Planned', -- Planned | Active | Completed
    created_at    TEXT NOT NULL
);

ALTER TABLE tasks ADD COLUMN sprint_id TEXT REFERENCES sprints(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint ON tasks(sprint_id);
