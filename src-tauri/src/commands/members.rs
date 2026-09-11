use crate::db::Db;
use crate::models_collab::{MemberInput, ProjectMember};
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn list_members(db: State<Db>, project_id: String) -> Result<Vec<ProjectMember>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT pm.id, pm.project_id, pm.user_id, u.display_name, pm.role
             FROM project_members pm JOIN users u ON u.id = pm.user_id
             WHERE pm.project_id = ?1
             ORDER BY CASE pm.role WHEN 'Owner' THEN 0 WHEN 'Admin' THEN 1 WHEN 'Editor' THEN 2 ELSE 3 END, u.display_name",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([project_id], |row| {
            Ok(ProjectMember {
                id: row.get(0)?,
                project_id: row.get(1)?,
                user_id: row.get(2)?,
                display_name: row.get(3)?,
                role: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// Adds a member by display name. Since this is the local-only version
/// (no accounts/invites yet — see docs/COLLABORATION.md), "adding a
/// member" just creates a named local user placeholder you can assign
/// tasks/comments to and set a role for; it doesn't grant real access
/// control until cloud sync ships.
#[tauri::command]
pub fn add_member(db: State<Db>, member: MemberInput) -> Result<ProjectMember, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let existing_user_id: Option<String> = conn
        .query_row(
            "SELECT id FROM users WHERE display_name = ?1",
            [&member.display_name],
            |row| row.get(0),
        )
        .ok();

    let user_id = match existing_user_id {
        Some(id) => id,
        None => {
            let id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO users (id, display_name, email, created_at) VALUES (?1, ?2, NULL, datetime('now'))",
                params![id, member.display_name],
            )
            .map_err(|e| e.to_string())?;
            id
        }
    };

    let member_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT OR REPLACE INTO project_members (id, project_id, user_id, role) VALUES (?1, ?2, ?3, ?4)",
        params![member_id, member.project_id, user_id, member.role],
    )
    .map_err(|e| e.to_string())?;

    Ok(ProjectMember {
        id: member_id,
        project_id: member.project_id,
        user_id,
        display_name: member.display_name,
        role: member.role,
    })
}

#[tauri::command]
pub fn update_member_role(db: State<Db>, member_id: String, role: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE project_members SET role = ?1 WHERE id = ?2", params![role, member_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn remove_member(db: State<Db>, member_id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM project_members WHERE id = ?1", [member_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
