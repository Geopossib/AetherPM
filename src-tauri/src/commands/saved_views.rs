use crate::db::Db;
use serde::{Deserialize, Serialize};
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedView {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub view_type: String, // board | table | timeline
    pub filter_json: String,
}

#[tauri::command]
pub fn save_view(db: State<Db>, project_id: String, name: String, view_type: String, filter_json: String) -> Result<SavedView, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO saved_views (id, project_id, name, view_type, filter_json) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, project_id, name, view_type, filter_json],
    )
    .map_err(|e| e.to_string())?;
    Ok(SavedView { id, project_id, name, view_type, filter_json })
}

#[tauri::command]
pub fn list_views(db: State<Db>, project_id: String, view_type: String) -> Result<Vec<SavedView>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, project_id, name, view_type, filter_json FROM saved_views WHERE project_id = ?1 AND view_type = ?2")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![project_id, view_type], |row| {
            Ok(SavedView {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                view_type: row.get(3)?,
                filter_json: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_view(db: State<Db>, view_id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM saved_views WHERE id = ?1", [view_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
