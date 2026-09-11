-- Phase 3: Advanced PM features.
-- Adds what the timeline/risk/decision/meeting-notes/workload/baseline
-- views need on top of the Phase 1 schema.

ALTER TABLE tasks ADD COLUMN assignee_name TEXT;
ALTER TABLE tasks ADD COLUMN start_date TEXT;

ALTER TABLE milestones ADD COLUMN description TEXT;
ALTER TABLE milestones ADD COLUMN created_at TEXT NOT NULL DEFAULT '';

ALTER TABLE risks ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
ALTER TABLE risks ADD COLUMN owner_name TEXT;

CREATE TABLE IF NOT EXISTS decisions (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    decision      TEXT NOT NULL,
    rationale     TEXT,
    status        TEXT NOT NULL DEFAULT 'Decided', -- Proposed | Decided | Reversed
    decided_at    TEXT,
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meeting_notes (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    meeting_date  TEXT NOT NULL,
    attendees     TEXT, -- comma-separated names, kept simple for v1
    notes         TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL
);

-- A baseline is a frozen snapshot of tasks/milestones at a point in
-- time, stored as JSON. "Planned vs current" is computed by diffing
-- this snapshot against live rows, so no separate baseline schema
-- per-field is needed for v1.
CREATE TABLE IF NOT EXISTS baselines (
    id              TEXT PRIMARY KEY,
    project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    snapshot_json   TEXT NOT NULL,
    created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_project ON meeting_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_baselines_project ON baselines(project_id);
