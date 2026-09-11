use crate::db::Db;
use serde::{Deserialize, Serialize};
use rusqlite::params;
use tauri::State;
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct SprintInput {
    pub id: Option<String>,
    pub project_id: String,
    pub name: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Sprint {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[tauri::command]
pub fn save_sprint(db: State<Db>, sprint: SprintInput) -> Result<Sprint, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let status = sprint.status.unwrap_or_else(|| "Planned".to_string());

    if let Some(id) = sprint.id {
        conn.execute(
            "UPDATE sprints SET name = ?1, start_date = ?2, end_date = ?3, status = ?4 WHERE id = ?5",
            params![sprint.name, sprint.start_date, sprint.end_date, status, id],
        )
        .map_err(|e| e.to_string())?;
        let created_at: String = conn
            .query_row("SELECT created_at FROM sprints WHERE id = ?1", [&id], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        Ok(Sprint { id, project_id: sprint.project_id, name: sprint.name, start_date: sprint.start_date, end_date: sprint.end_date, status, created_at })
    } else {
        let id = Uuid::new_v4().to_string();
        let created_at = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO sprints (id, project_id, name, start_date, end_date, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, sprint.project_id, sprint.name, sprint.start_date, sprint.end_date, status, created_at],
        )
        .map_err(|e| e.to_string())?;
        Ok(Sprint { id, project_id: sprint.project_id, name: sprint.name, start_date: sprint.start_date, end_date: sprint.end_date, status, created_at })
    }
}

#[tauri::command]
pub fn list_sprints(db: State<Db>, project_id: String) -> Result<Vec<Sprint>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, project_id, name, start_date, end_date, status, created_at FROM sprints WHERE project_id = ?1 ORDER BY start_date ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([project_id], |row| {
            Ok(Sprint {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                start_date: row.get(3)?,
                end_date: row.get(4)?,
                status: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_sprint(db: State<Db>, sprint_id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM sprints WHERE id = ?1", [sprint_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
