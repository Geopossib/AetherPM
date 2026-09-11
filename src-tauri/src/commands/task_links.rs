use crate::db::Db;
use serde::{Deserialize, Serialize};
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskLink {
    pub id: String,
    pub project_id: String,
    pub from_task_id: String,
    pub to_task_id: String,
    pub link_type: String, // blocks | relates_to | duplicates
}

#[tauri::command]
pub fn create_task_link(db: State<Db>, project_id: String, from_task_id: String, to_task_id: String, link_type: String) -> Result<TaskLink, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO task_links (id, project_id, from_task_id, to_task_id, link_type) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, project_id, from_task_id, to_task_id, link_type],
    )
    .map_err(|e| e.to_string())?;
    Ok(TaskLink { id, project_id, from_task_id, to_task_id, link_type })
}

#[tauri::command]
pub fn list_task_links(db: State<Db>, project_id: String) -> Result<Vec<TaskLink>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, project_id, from_task_id, to_task_id, link_type FROM task_links WHERE project_id = ?1")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([project_id], |row| {
            Ok(TaskLink {
                id: row.get(0)?,
                project_id: row.get(1)?,
                from_task_id: row.get(2)?,
                to_task_id: row.get(3)?,
                link_type: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_task_link(db: State<Db>, link_id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM task_links WHERE id = ?1", [link_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
