use crate::db::Db;
use crate::models::{Requirement, RequirementInput, TraceLink};
use chrono::Utc;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

/// Requirement keys are per-project sequential ids like REQ-001, REQ-002.
/// Computed from the current row count rather than stored as a counter,
/// which is simpler and fine for local single-user use.
fn next_req_key(conn: &rusqlite::Connection, project_id: &str) -> Result<String, String> {
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM requirements WHERE project_id = ?1",
            [project_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(format!("REQ-{:03}", count + 1))
}

#[tauri::command]
pub fn save_requirement(db: State<Db>, req: RequirementInput) -> Result<Requirement, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let req_type = req.req_type.unwrap_or_else(|| "Functional".to_string());
    let status = req.status.unwrap_or_else(|| "Draft".to_string());
    let priority = req.priority.unwrap_or_else(|| "Medium".to_string());
    let verification_method = req.verification_method.unwrap_or_else(|| "None".to_string());

    if let Some(id) = req.id {
        conn.execute(
            "UPDATE requirements SET statement = ?1, req_type = ?2, status = ?3, priority = ?4,
             verification_method = ?5, parent_requirement_id = ?6 WHERE id = ?7",
            params![
                req.statement,
                req_type,
                status,
                priority,
                verification_method,
                req.parent_requirement_id,
                id
            ],
        )
        .map_err(|e| e.to_string())?;

        let (req_key, created_at): (String, String) = conn
            .query_row(
                "SELECT req_key, created_at FROM requirements WHERE id = ?1",
                [&id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .map_err(|e| e.to_string())?;

        Ok(Requirement {
            id,
            project_id: req.project_id,
            req_key,
            statement: req.statement,
            req_type,
            status,
            priority,
            verification_method,
            parent_requirement_id: req.parent_requirement_id,
            created_at,
        })
    } else {
        let id = Uuid::new_v4().to_string();
        let created_at = Utc::now().to_rfc3339();
        let req_key = next_req_key(&conn, &req.project_id)?;

        conn.execute(
            "INSERT INTO requirements (id, project_id, req_key, statement, req_type, status,
             priority, verification_method, parent_requirement_id, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                id,
                req.project_id,
                req_key,
                req.statement,
                req_type,
                status,
                priority,
                verification_method,
                req.parent_requirement_id,
                created_at
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(Requirement {
            id,
            project_id: req.project_id,
            req_key,
            statement: req.statement,
            req_type,
            status,
            priority,
            verification_method,
            parent_requirement_id: req.parent_requirement_id,
            created_at,
        })
    }
}

#[tauri::command]
pub fn list_requirements(db: State<Db>, project_id: String) -> Result<Vec<Requirement>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, req_key, statement, req_type, status, priority,
             verification_method, parent_requirement_id, created_at
             FROM requirements WHERE project_id = ?1 ORDER BY req_key ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([project_id], |row| {
            Ok(Requirement {
                id: row.get(0)?,
                project_id: row.get(1)?,
                req_key: row.get(2)?,
                statement: row.get(3)?,
                req_type: row.get(4)?,
                status: row.get(5)?,
                priority: row.get(6)?,
                verification_method: row.get(7)?,
                parent_requirement_id: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_trace_link(db: State<Db>, link: TraceLink) -> Result<TraceLink, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO trace_links (id, project_id, source_type, source_id, target_type, target_id, relation)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, link.project_id, link.source_type, link.source_id, link.target_type, link.target_id, link.relation],
    )
    .map_err(|e| e.to_string())?;

    Ok(TraceLink { id, ..link })
}

#[tauri::command]
pub fn list_trace_links(db: State<Db>, project_id: String) -> Result<Vec<TraceLink>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, source_type, source_id, target_type, target_id, relation
             FROM trace_links WHERE project_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([project_id], |row| {
            Ok(TraceLink {
                id: row.get(0)?,
                project_id: row.get(1)?,
                source_type: row.get(2)?,
                source_id: row.get(3)?,
                target_type: row.get(4)?,
                target_id: row.get(5)?,
                relation: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// Validation rule: a requirement with no trace_links row on either
/// side (as source or target) is "orphaned" - nothing satisfies it and
/// it satisfies nothing. Surfaced in the Requirements view as a warning.
#[tauri::command]
pub fn find_orphan_requirements(db: State<Db>, project_id: String) -> Result<Vec<Requirement>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, req_key, statement, req_type, status, priority,
             verification_method, parent_requirement_id, created_at
             FROM requirements
             WHERE project_id = ?1
             AND id NOT IN (
                SELECT source_id FROM trace_links WHERE project_id = ?1 AND source_type = 'requirement'
                UNION
                SELECT target_id FROM trace_links WHERE project_id = ?1 AND target_type = 'requirement'
             )",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([&project_id], |row| {
            Ok(Requirement {
                id: row.get(0)?,
                project_id: row.get(1)?,
                req_key: row.get(2)?,
                statement: row.get(3)?,
                req_type: row.get(4)?,
                status: row.get(5)?,
                priority: row.get(6)?,
                verification_method: row.get(7)?,
                parent_requirement_id: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
