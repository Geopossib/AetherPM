-- AetherPM initial schema.
-- Naming convention: snake_case tables, TEXT ids (UUID v4 as string)
-- so the same id format works if we later sync to a cloud Postgres DB.

CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    display_name  TEXT NOT NULL,
    email         TEXT,
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    description   TEXT,
    project_type  TEXT NOT NULL DEFAULT 'General',
    archived      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_members (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role          TEXT NOT NULL DEFAULT 'Editor', -- Owner | Admin | Editor | Viewer
    UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS tasks (
    id              TEXT PRIMARY KEY,
    project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'Todo',
    priority        TEXT NOT NULL DEFAULT 'Medium',
    parent_task_id  TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    estimate_hours  REAL,
    actual_hours    REAL,
    due_date        TEXT,
    created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_links (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    from_task_id  TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    to_task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    link_type     TEXT NOT NULL DEFAULT 'blocks' -- blocks | relates_to | duplicates
);

CREATE TABLE IF NOT EXISTS milestones (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    due_date      TEXT,
    status        TEXT NOT NULL DEFAULT 'Planned'
);

CREATE TABLE IF NOT EXISTS requirements (
    id                      TEXT PRIMARY KEY,
    project_id              TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    req_key                 TEXT NOT NULL, -- e.g. REQ-014, unique per project
    statement               TEXT NOT NULL,
    req_type                TEXT NOT NULL DEFAULT 'Functional',
    status                  TEXT NOT NULL DEFAULT 'Draft',
    priority                TEXT NOT NULL DEFAULT 'Medium',
    verification_method     TEXT NOT NULL DEFAULT 'None',
    parent_requirement_id   TEXT REFERENCES requirements(id) ON DELETE SET NULL,
    created_at              TEXT NOT NULL,
    UNIQUE(project_id, req_key)
);

CREATE TABLE IF NOT EXISTS sysml_elements (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    element_type  TEXT NOT NULL, -- block | port | actor | use_case | activity
    name          TEXT NOT NULL,
    package       TEXT,
    properties    TEXT -- JSON blob for element-specific attributes
);

CREATE TABLE IF NOT EXISTS diagrams (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    diagram_type  TEXT NOT NULL -- Requirements | BDD | IBD | UseCase | Activity
);

CREATE TABLE IF NOT EXISTS diagram_nodes (
    id            TEXT PRIMARY KEY,
    diagram_id    TEXT NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
    element_id    TEXT REFERENCES sysml_elements(id) ON DELETE SET NULL,
    label         TEXT NOT NULL,
    pos_x         REAL NOT NULL DEFAULT 0,
    pos_y         REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS diagram_edges (
    id              TEXT PRIMARY KEY,
    diagram_id      TEXT NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
    source_node_id  TEXT NOT NULL REFERENCES diagram_nodes(id) ON DELETE CASCADE,
    target_node_id  TEXT NOT NULL REFERENCES diagram_nodes(id) ON DELETE CASCADE,
    label           TEXT
);

-- Generic traceability: links any entity to any other entity
-- (requirement <-> block <-> task <-> test) with a typed relation.
CREATE TABLE IF NOT EXISTS trace_links (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_type   TEXT NOT NULL,
    source_id     TEXT NOT NULL,
    target_type   TEXT NOT NULL,
    target_id     TEXT NOT NULL,
    relation      TEXT NOT NULL DEFAULT 'satisfies' -- satisfies | derives | verifies | allocates
);

CREATE TABLE IF NOT EXISTS risks (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    description   TEXT,
    likelihood    TEXT NOT NULL DEFAULT 'Medium',
    impact        TEXT NOT NULL DEFAULT 'Medium',
    status        TEXT NOT NULL DEFAULT 'Open',
    owner_id      TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS comments (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    entity_type   TEXT NOT NULL, -- task | requirement | diagram
    entity_id     TEXT NOT NULL,
    author_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
    body          TEXT NOT NULL,
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id    TEXT REFERENCES projects(id) ON DELETE CASCADE,
    body          TEXT NOT NULL,
    read          INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_events (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    actor_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
    entity_type   TEXT NOT NULL,
    entity_id     TEXT NOT NULL,
    action        TEXT NOT NULL, -- created | updated | deleted | commented
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    entity_type   TEXT NOT NULL,
    entity_id     TEXT NOT NULL,
    file_path     TEXT NOT NULL, -- local file reference, not the file itself
    file_name     TEXT NOT NULL,
    added_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_views (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    view_type     TEXT NOT NULL, -- board | table | timeline
    filter_json   TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_project ON requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_trace_links_project ON trace_links(project_id);
CREATE INDEX IF NOT EXISTS idx_trace_links_source ON trace_links(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_trace_links_target ON trace_links(target_type, target_id);
