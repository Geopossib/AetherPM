use crate::db::Db;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActivityEvent {
    pub id: String,
    pub project_id: String,
    pub actor_name: String,
    pub entity_type: String,
    pub entity_id: String,
    pub action: String,
    pub created_at: String,
}

#[tauri::command]
pub fn list_activity(db: State<Db>, project_id: String, limit: i64) -> Result<Vec<ActivityEvent>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT ae.id, ae.project_id, COALESCE(u.display_name, 'You'), ae.entity_type, ae.entity_id, ae.action, ae.created_at
             FROM activity_events ae LEFT JOIN users u ON u.id = ae.actor_id
             WHERE ae.project_id = ?1
             ORDER BY ae.created_at DESC
             LIMIT ?2",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(rusqlite::params![project_id, limit], |row| {
            Ok(ActivityEvent {
                id: row.get(0)?,
                project_id: row.get(1)?,
                actor_name: row.get(2)?,
                entity_type: row.get(3)?,
                entity_id: row.get(4)?,
                action: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
