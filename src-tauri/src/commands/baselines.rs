use crate::db::Db;
use crate::models::{Baseline, BaselineComparison, Task};
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
struct Snapshot {
    tasks: Vec<Task>,
}

fn load_tasks(conn: &rusqlite::Connection, project_id: &str) -> Result<Vec<Task>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, title, description, status, priority, parent_task_id,
             estimate_hours, actual_hours, due_date, start_date, assignee_name, created_at
             FROM tasks WHERE project_id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([project_id], |row| {
            Ok(Task {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                status: row.get(4)?,
                priority: row.get(5)?,
                parent_task_id: row.get(6)?,
                estimate_hours: row.get(7)?,
                actual_hours: row.get(8)?,
                due_date: row.get(9)?,
                start_date: row.get(10)?,
                assignee_name: row.get(11)?,
                created_at: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// Freezes the current task list as a named snapshot. Comparing a
/// live project against a baseline is how "planned vs current"
/// tracking works without a separate parallel schema per field.
#[tauri::command]
pub fn create_baseline(db: State<Db>, project_id: String, name: String) -> Result<Baseline, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let tasks = load_tasks(&conn, &project_id)?;
    let snapshot = Snapshot { tasks };
    let snapshot_json = serde_json::to_string(&snapshot).map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO baselines (id, project_id, name, snapshot_json, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, project_id, name, snapshot_json, created_at],
    )
    .map_err(|e| e.to_string())?;

    Ok(Baseline { id, project_id, name, created_at })
}

#[tauri::command]
pub fn list_baselines(db: State<Db>, project_id: String) -> Result<Vec<Baseline>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, project_id, name, created_at FROM baselines WHERE project_id = ?1 ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([project_id], |row| {
            Ok(Baseline {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn compare_baseline(db: State<Db>, baseline_id: String) -> Result<BaselineComparison, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let (project_id, name, created_at, snapshot_json): (String, String, String, String) = conn
        .query_row(
            "SELECT project_id, name, created_at, snapshot_json FROM baselines WHERE id = ?1",
            [&baseline_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|e| format!("baseline not found: {e}"))?;

    let snapshot: Snapshot = serde_json::from_str(&snapshot_json).map_err(|e| e.to_string())?;
    let baseline_task_ids: std::collections::HashSet<String> = snapshot.tasks.iter().map(|t| t.id.clone()).collect();

    let current_tasks = load_tasks(&conn, &project_id)?;
    let tasks_added_since = current_tasks.iter().filter(|t| !baseline_task_ids.contains(&t.id)).count() as i64;

    let baseline_done: std::collections::HashSet<String> = snapshot
        .tasks
        .iter()
        .filter(|t| t.status == "Done")
        .map(|t| t.id.clone())
        .collect();
    let tasks_completed_since = current_tasks
        .iter()
        .filter(|t| t.status == "Done" && !baseline_done.contains(&t.id))
        .count() as i64;

    let now = Utc::now();
    let tasks_overdue_now = current_tasks
        .iter()
        .filter(|t| {
            t.status != "Done"
                && t.due_date
                    .as_ref()
                    .and_then(|d| chrono::DateTime::parse_from_rfc3339(d).ok())
                    .map(|d| d < now)
                    .unwrap_or(false)
        })
        .count() as i64;

    Ok(BaselineComparison {
        baseline: Baseline { id: baseline_id, project_id, name, created_at },
        tasks_added_since,
        tasks_completed_since,
        tasks_overdue_now,
    })
}
