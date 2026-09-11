use crate::models_collab::{Comment, CommentInput, Notification};
use crate::db::Db;
use chrono::Utc;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

/// Finds "@Name" mentions in a comment body and matches them against
/// this project's members by display name (case-insensitive, spaces
/// allowed via matching the longest member name that appears after the
/// @). Kept intentionally simple: a full parser isn't worth it for v1.
fn find_mentions(conn: &rusqlite::Connection, project_id: &str, body: &str) -> Vec<(String, String)> {
    let mut stmt = match conn.prepare(
        "SELECT pm.user_id, u.display_name FROM project_members pm JOIN users u ON u.id = pm.user_id WHERE pm.project_id = ?1",
    ) {
        Ok(s) => s,
        Err(_) => return vec![],
    };
    let members: Vec<(String, String)> = stmt
        .query_map([project_id], |row| Ok((row.get(0)?, row.get(1)?)))
        .map(|rows| rows.filter_map(|r| r.ok()).collect())
        .unwrap_or_default();

    let lower_body = body.to_lowercase();
    members
        .into_iter()
        .filter(|(_, name)| lower_body.contains(&format!("@{}", name.to_lowercase())))
        .collect()
}

#[tauri::command]
pub fn save_comment(db: State<Db>, comment: CommentInput) -> Result<Comment, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let author_id = "local-user";

    conn.execute(
        "INSERT INTO comments (id, project_id, entity_type, entity_id, author_id, body, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, comment.project_id, comment.entity_type, comment.entity_id, author_id, comment.body, created_at],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO activity_events (id, project_id, actor_id, entity_type, entity_id, action, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'commented', ?6)",
        params![Uuid::new_v4().to_string(), comment.project_id, author_id, comment.entity_type, comment.entity_id, created_at],
    )
    .map_err(|e| e.to_string())?;

    // Mentioned members get a notification pointing back at this comment's entity.
    for (user_id, _name) in find_mentions(&conn, &comment.project_id, &comment.body) {
        conn.execute(
            "INSERT INTO notifications (id, user_id, project_id, body, read, created_at) VALUES (?1, ?2, ?3, ?4, 0, ?5)",
            params![
                Uuid::new_v4().to_string(),
                user_id,
                comment.project_id,
                format!("You were mentioned on a {}: \"{}\"", comment.entity_type, truncate(&comment.body, 80)),
                created_at
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(Comment {
        id,
        project_id: comment.project_id,
        entity_type: comment.entity_type,
        entity_id: comment.entity_id,
        author_id: Some(author_id.to_string()),
        author_name: "You".to_string(),
        body: comment.body,
        created_at,
    })
}

#[tauri::command]
pub fn list_comments(db: State<Db>, project_id: String, entity_type: String, entity_id: String) -> Result<Vec<Comment>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.project_id, c.entity_type, c.entity_id, c.author_id, COALESCE(u.display_name, 'Unknown'), c.body, c.created_at
             FROM comments c LEFT JOIN users u ON u.id = c.author_id
             WHERE c.project_id = ?1 AND c.entity_type = ?2 AND c.entity_id = ?3
             ORDER BY c.created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![project_id, entity_type, entity_id], |row| {
            Ok(Comment {
                id: row.get(0)?,
                project_id: row.get(1)?,
                entity_type: row.get(2)?,
                entity_id: row.get(3)?,
                author_id: row.get(4)?,
                author_name: row.get(5)?,
                body: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_notifications(db: State<Db>) -> Result<Vec<Notification>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, user_id, project_id, body, read, created_at FROM notifications WHERE user_id = 'local-user' ORDER BY created_at DESC LIMIT 50")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Notification {
                id: row.get(0)?,
                user_id: row.get(1)?,
                project_id: row.get(2)?,
                body: row.get(3)?,
                read: row.get::<_, i64>(4)? != 0,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn mark_notification_read(db: State<Db>, notification_id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE notifications SET read = 1 WHERE id = ?1", [notification_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn mark_all_notifications_read(db: State<Db>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE notifications SET read = 1 WHERE user_id = 'local-user'", [])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        format!("{}…", s.chars().take(max).collect::<String>())
    }
}
