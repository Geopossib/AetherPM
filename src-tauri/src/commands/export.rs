use crate::db::Db;
use crate::models::{Project, ProjectExport, Requirement, Task, TraceLink};
use chrono::Utc;
use rusqlite::params;
use std::fs;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn export_project(db: State<Db>, project_id: String, dest_path: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let project = conn
        .query_row(
            "SELECT id, name, description, project_type, archived, created_at FROM projects WHERE id = ?1",
            [&project_id],
            |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    project_type: row.get(3)?,
                    archived: row.get::<_, i64>(4)? != 0,
                    created_at: row.get(5)?,
                })
            },
        )
        .map_err(|e| format!("project not found: {e}"))?;

    let mut task_stmt = conn
        .prepare(
            "SELECT id, project_id, title, description, status, priority, parent_task_id,
             estimate_hours, actual_hours, due_date, start_date, assignee_name, sprint_id, tags, created_at
             FROM tasks WHERE project_id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let tasks: Vec<Task> = task_stmt
        .query_map([&project_id], |row| {
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
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;

    let mut req_stmt = conn
        .prepare(
            "SELECT id, project_id, req_key, statement, req_type, status, priority,
             verification_method, parent_requirement_id, created_at FROM requirements WHERE project_id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let requirements: Vec<Requirement> = req_stmt
        .query_map([&project_id], |row| {
            Ok(Requirement {
                id: row.get(0)?,
                project_id: row.get(1)?,
                req_key: row.get(2)?,
                statement: row.get(3)?,
                req_type: row.get(4)?,
                status: row.get(5)?,
                priority: row.get(6)?,
                verification_method: row.get(7)?,
                parent_requirement_id: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;

    let mut link_stmt = conn
        .prepare(
            "SELECT id, project_id, source_type, source_id, target_type, target_id, relation
             FROM trace_links WHERE project_id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let trace_links: Vec<TraceLink> = link_stmt
        .query_map([&project_id], |row| {
            Ok(TraceLink {
                id: row.get(0)?,
                project_id: row.get(1)?,
                source_type: row.get(2)?,
                source_id: row.get(3)?,
                target_type: row.get(4)?,
                target_id: row.get(5)?,
                relation: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;

    let package = ProjectExport { project, tasks, requirements, trace_links };
    let json = serde_json::to_string_pretty(&package).map_err(|e| e.to_string())?;
    fs::write(&dest_path, json).map_err(|e| format!("failed to write export file: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn import_project(db: State<Db>, src_path: String) -> Result<Project, String> {
    let contents = fs::read_to_string(&src_path).map_err(|e| format!("failed to read file: {e}"))?;
    let package: ProjectExport = serde_json::from_str(&contents).map_err(|e| format!("invalid export file: {e}"))?;

    let conn = db.0.lock().map_err(|e| e.to_string())?;

    // Imported project gets a fresh id so it never collides with an
    // existing local project, even if re-importing the same export twice.
    let new_project_id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO projects (id, name, description, project_type, archived, created_at)
         VALUES (?1, ?2, ?3, ?4, 0, ?5)",
        params![new_project_id, package.project.name, package.project.description, package.project.project_type, created_at],
    )
    .map_err(|e| e.to_string())?;

    for t in &package.tasks {
        conn.execute(
            "INSERT INTO tasks (id, project_id, title, description, status, priority, parent_task_id,
             estimate_hours, actual_hours, due_date, start_date, assignee_name, sprint_id, tags, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                Uuid::new_v4().to_string(), new_project_id, t.title, t.description, t.status, t.priority,
                Option::<String>::None, t.estimate_hours, t.actual_hours, t.due_date,
                t.start_date, t.assignee_name, Option::<String>::None, t.tags, t.created_at
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    for r in &package.requirements {
        conn.execute(
            "INSERT INTO requirements (id, project_id, req_key, statement, req_type, status, priority,
             verification_method, parent_requirement_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                Uuid::new_v4().to_string(), new_project_id, r.req_key, r.statement, r.req_type, r.status,
                r.priority, r.verification_method, Option::<String>::None, r.created_at
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(Project {
        id: new_project_id,
        name: package.project.name,
        description: package.project.description,
        project_type: package.project.project_type,
        archived: false,
        created_at,
    })
}
