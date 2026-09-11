use crate::db::Db;
use crate::models::{Milestone, MilestoneInput};
use chrono::Utc;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn save_milestone(db: State<Db>, milestone: MilestoneInput) -> Result<Milestone, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let status = milestone.status.unwrap_or_else(|| "Planned".to_string());

    if let Some(id) = milestone.id {
        conn.execute(
            "UPDATE milestones SET name = ?1, description = ?2, due_date = ?3, status = ?4 WHERE id = ?5",
            params![milestone.name, milestone.description, milestone.due_date, status, id],
        )
        .map_err(|e| e.to_string())?;

        let created_at: String = conn
            .query_row("SELECT created_at FROM milestones WHERE id = ?1", [&id], |r| r.get(0))
            .map_err(|e| e.to_string())?;

        Ok(Milestone {
            id,
            project_id: milestone.project_id,
            name: milestone.name,
            description: milestone.description,
            due_date: milestone.due_date,
            status,
            created_at,
        })
    } else {
        let id = Uuid::new_v4().to_string();
        let created_at = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO milestones (id, project_id, name, description, due_date, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, milestone.project_id, milestone.name, milestone.description, milestone.due_date, status, created_at],
        )
        .map_err(|e| e.to_string())?;

        Ok(Milestone {
            id,
            project_id: milestone.project_id,
            name: milestone.name,
            description: milestone.description,
            due_date: milestone.due_date,
            status,
            created_at,
        })
    }
}

#[tauri::command]
pub fn list_milestones(db: State<Db>, project_id: String) -> Result<Vec<Milestone>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, name, description, due_date, status, created_at
             FROM milestones WHERE project_id = ?1 ORDER BY due_date ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([project_id], |row| {
            Ok(Milestone {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                due_date: row.get(4)?,
                status: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_milestone(db: State<Db>, milestone_id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM milestones WHERE id = ?1", [milestone_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
