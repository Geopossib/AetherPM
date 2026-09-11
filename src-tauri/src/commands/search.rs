use crate::db::Db;
use crate::models::SearchResult;
use tauri::State;

#[tauri::command]
pub fn search_all(db: State<Db>, project_id: String, query: String) -> Result<Vec<SearchResult>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let like = format!("%{}%", query);
    let mut results = Vec::new();

    let mut task_stmt = conn
        .prepare("SELECT id, title, description FROM tasks WHERE project_id = ?1 AND (title LIKE ?2 OR description LIKE ?2 OR tags LIKE ?2) LIMIT 20")
        .map_err(|e| e.to_string())?;
    let task_rows = task_stmt
        .query_map(rusqlite::params![project_id, like], |row| {
            let id: String = row.get(0)?;
            let title: String = row.get(1)?;
            let description: Option<String> = row.get(2)?;
            Ok(SearchResult {
                entity_type: "task".into(),
                entity_id: id,
                project_id: project_id.clone(),
                title,
                snippet: description.unwrap_or_default(),
            })
        })
        .map_err(|e| e.to_string())?;
    for r in task_rows {
        results.push(r.map_err(|e| e.to_string())?);
    }

    let mut req_stmt = conn
        .prepare("SELECT id, req_key, statement FROM requirements WHERE project_id = ?1 AND statement LIKE ?2 LIMIT 20")
        .map_err(|e| e.to_string())?;
    let req_rows = req_stmt
        .query_map(rusqlite::params![project_id, like], |row| {
            let id: String = row.get(0)?;
            let req_key: String = row.get(1)?;
            let statement: String = row.get(2)?;
            Ok(SearchResult {
                entity_type: "requirement".into(),
                entity_id: id,
                project_id: project_id.clone(),
                title: req_key,
                snippet: statement,
            })
        })
        .map_err(|e| e.to_string())?;
    for r in req_rows {
        results.push(r.map_err(|e| e.to_string())?);
    }

    Ok(results)
}
