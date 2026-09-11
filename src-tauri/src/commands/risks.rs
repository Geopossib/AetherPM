use crate::db::Db;
use crate::models::{Risk, RiskInput};
use chrono::Utc;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn save_risk(db: State<Db>, risk: RiskInput) -> Result<Risk, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let likelihood = risk.likelihood.unwrap_or_else(|| "Medium".to_string());
    let impact = risk.impact.unwrap_or_else(|| "Medium".to_string());
    let status = risk.status.unwrap_or_else(|| "Open".to_string());

    if let Some(id) = risk.id {
        conn.execute(
            "UPDATE risks SET title = ?1, description = ?2, likelihood = ?3, impact = ?4,
             status = ?5, owner_name = ?6 WHERE id = ?7",
            params![risk.title, risk.description, likelihood, impact, status, risk.owner_name, id],
        )
        .map_err(|e| e.to_string())?;

        let created_at: String = conn
            .query_row("SELECT created_at FROM risks WHERE id = ?1", [&id], |r| r.get(0))
            .map_err(|e| e.to_string())?;

        Ok(Risk {
            id,
            project_id: risk.project_id,
            title: risk.title,
            description: risk.description,
            likelihood,
            impact,
            status,
            owner_name: risk.owner_name,
            created_at,
        })
    } else {
        let id = Uuid::new_v4().to_string();
        let created_at = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO risks (id, project_id, title, description, likelihood, impact, status, owner_name, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![id, risk.project_id, risk.title, risk.description, likelihood, impact, status, risk.owner_name, created_at],
        )
        .map_err(|e| e.to_string())?;

        Ok(Risk {
            id,
            project_id: risk.project_id,
            title: risk.title,
            description: risk.description,
            likelihood,
            impact,
            status,
            owner_name: risk.owner_name,
            created_at,
        })
    }
}

#[tauri::command]
pub fn list_risks(db: State<Db>, project_id: String) -> Result<Vec<Risk>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, title, description, likelihood, impact, status, owner_name, created_at
             FROM risks WHERE project_id = ?1 ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([project_id], |row| {
            Ok(Risk {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                likelihood: row.get(4)?,
                impact: row.get(5)?,
                status: row.get(6)?,
                owner_name: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
