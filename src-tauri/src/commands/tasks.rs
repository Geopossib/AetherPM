use crate::db::Db;
use crate::models::{Task, TaskInput};
use chrono::Utc;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn save_task(db: State<Db>, task: TaskInput) -> Result<Task, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let status = task.status.unwrap_or_else(|| "Todo".to_string());
    let priority = task.priority.unwrap_or_else(|| "Medium".to_string());

    match task.id {
        Some(id) => {
            conn.execute(
                "UPDATE tasks SET title = ?1, description = ?2, status = ?3, priority = ?4,
                 parent_task_id = ?5, estimate_hours = ?6, actual_hours = ?7, due_date = ?8,
                 start_date = ?9, assignee_name = ?10, sprint_id = ?11, tags = ?12
                 WHERE id = ?13",
                params![
                    task.title,
                    task.description,
                    status,
                    priority,
                    task.parent_task_id,
                    task.estimate_hours,
                    task.actual_hours,
                    task.due_date,
                    task.start_date,
                    task.assignee_name,
                    task.sprint_id,
                    task.tags,
                    id
                ],
            )
            .map_err(|e| e.to_string())?;

            let created_at: String = conn
                .query_row("SELECT created_at FROM tasks WHERE id = ?1", [&id], |r| r.get(0))
                .map_err(|e| e.to_string())?;

            Ok(Task {
                id,
                project_id: task.project_id,
                title: task.title,
                description: task.description,
                status,
                priority,
                parent_task_id: task.parent_task_id,
                estimate_hours: task.estimate_hours,
                actual_hours: task.actual_hours,
                due_date: task.due_date,
                start_date: task.start_date,
                assignee_name: task.assignee_name,
                sprint_id: task.sprint_id,
                tags: task.tags,
                created_at,
            })
        }
        None => {
            let id = Uuid::new_v4().to_string();
            let created_at = Utc::now().to_rfc3339();

            conn.execute(
                "INSERT INTO tasks (id, project_id, title, description, status, priority,
                 parent_task_id, estimate_hours, actual_hours, due_date, start_date, assignee_name, sprint_id, tags, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
                params![
                    id,
                    task.project_id,
                    task.title,
                    task.description,
                    status,
                    priority,
                    task.parent_task_id,
                    task.estimate_hours,
                    task.actual_hours,
                    task.due_date,
                    task.start_date,
                    task.assignee_name,
                    task.sprint_id,
                    task.tags,
                    created_at
                ],
            )
            .map_err(|e| e.to_string())?;

            conn.execute(
                "INSERT INTO activity_events (id, project_id, actor_id, entity_type, entity_id, action, created_at)
                 VALUES (?1, ?2, NULL, 'task', ?3, 'created', ?4)",
                params![Uuid::new_v4().to_string(), task.project_id, id, created_at],
            )
            .map_err(|e| e.to_string())?;

            Ok(Task {
                id,
                project_id: task.project_id,
                title: task.title,
                description: task.description,
                status,
                priority,
                parent_task_id: task.parent_task_id,
                estimate_hours: task.estimate_hours,
                actual_hours: task.actual_hours,
                due_date: task.due_date,
                start_date: task.start_date,
                assignee_name: task.assignee_name,
                sprint_id: task.sprint_id,
                tags: task.tags,
                created_at,
            })
        }
    }
}

#[tauri::command]
pub fn list_tasks(db: State<Db>, project_id: String) -> Result<Vec<Task>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, title, description, status, priority, parent_task_id,
             estimate_hours, actual_hours, due_date, start_date, assignee_name, sprint_id, tags, created_at
             FROM tasks WHERE project_id = ?1 ORDER BY created_at DESC",
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
                sprint_id: row.get(12)?,
                tags: row.get(13)?,
                created_at: row.get(14)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_task(db: State<Db>, task_id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tasks WHERE id = ?1", [task_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
