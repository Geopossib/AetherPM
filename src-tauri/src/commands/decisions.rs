use crate::db::Db;
use crate::models::{Decision, DecisionInput};
use chrono::Utc;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn save_decision(db: State<Db>, decision: DecisionInput) -> Result<Decision, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let status = decision.status.unwrap_or_else(|| "Decided".to_string());

    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO decisions (id, project_id, title, decision, rationale, status, decided_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            decision.project_id,
            decision.title,
            decision.decision,
            decision.rationale,
            status,
            decision.decided_at,
            created_at
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Decision {
        id,
        project_id: decision.project_id,
        title: decision.title,
        decision: decision.decision,
        rationale: decision.rationale,
        status,
        decided_at: decision.decided_at,
        created_at,
    })
}

#[tauri::command]
pub fn list_decisions(db: State<Db>, project_id: String) -> Result<Vec<Decision>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, title, decision, rationale, status, decided_at, created_at
             FROM decisions WHERE project_id = ?1 ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([project_id], |row| {
            Ok(Decision {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                decision: row.get(3)?,
                rationale: row.get(4)?,
                status: row.get(5)?,
                decided_at: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
