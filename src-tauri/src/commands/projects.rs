use crate::db::Db;
use crate::models::Project;
use chrono::Utc;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn create_project(
    db: State<Db>,
    name: String,
    description: Option<String>,
    project_type: String,
) -> Result<Project, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO projects (id, name, description, project_type, archived, created_at)
         VALUES (?1, ?2, ?3, ?4, 0, ?5)",
        params![id, name, description, project_type, created_at],
    )
    .map_err(|e| e.to_string())?;

    // Every project needs at least an Owner. In this local-only version
    // that's always the single local user; multi-user membership becomes
    // meaningful once cloud sync ships (see docs/COLLABORATION.md).
    conn.execute(
        "INSERT OR IGNORE INTO users (id, display_name, email, created_at) VALUES ('local-user', 'You', NULL, ?1)",
        params![created_at],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO project_members (id, project_id, user_id, role) VALUES (?1, ?2, 'local-user', 'Owner')",
        params![Uuid::new_v4().to_string(), id],
    )
    .map_err(|e| e.to_string())?;

    Ok(Project {
        id,
        name,
        description,
        project_type,
        archived: false,
        created_at,
    })
}

#[tauri::command]
pub fn list_projects(db: State<Db>, include_archived: bool) -> Result<Vec<Project>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let sql = if include_archived {
        "SELECT id, name, description, project_type, archived, created_at FROM projects ORDER BY created_at DESC"
    } else {
        "SELECT id, name, description, project_type, archived, created_at FROM projects WHERE archived = 0 ORDER BY created_at DESC"
    };
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                project_type: row.get(3)?,
                archived: row.get::<_, i64>(4)? != 0,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn archive_project(db: State<Db>, project_id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE projects SET archived = 1 WHERE id = ?1",
        params![project_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
