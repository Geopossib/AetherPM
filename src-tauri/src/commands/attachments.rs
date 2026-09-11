use crate::db::Db;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Attachment {
    pub id: String,
    pub project_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub file_path: String,
    pub file_name: String,
    pub added_at: String,
}

#[tauri::command]
pub fn add_attachment(
    db: State<Db>,
    project_id: String,
    entity_type: String,
    entity_id: String,
    file_path: String,
    file_name: String,
) -> Result<Attachment, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let added_at = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO attachments (id, project_id, entity_type, entity_id, file_path, file_name, added_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, project_id, entity_type, entity_id, file_path, file_name, added_at],
    )
    .map_err(|e| e.to_string())?;
    Ok(Attachment { id, project_id, entity_type, entity_id, file_path, file_name, added_at })
}

#[tauri::command]
pub fn list_attachments(db: State<Db>, project_id: String, entity_type: String, entity_id: String) -> Result<Vec<Attachment>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, entity_type, entity_id, file_path, file_name, added_at
             FROM attachments WHERE project_id = ?1 AND entity_type = ?2 AND entity_id = ?3
             ORDER BY added_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![project_id, entity_type, entity_id], |row| {
            Ok(Attachment {
                id: row.get(0)?,
                project_id: row.get(1)?,
                entity_type: row.get(2)?,
                entity_id: row.get(3)?,
                file_path: row.get(4)?,
                file_name: row.get(5)?,
                added_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_attachment(db: State<Db>, attachment_id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM attachments WHERE id = ?1", [attachment_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
