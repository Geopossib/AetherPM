use crate::db::Db;
use crate::models::{MeetingNote, MeetingNoteInput};
use chrono::Utc;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn save_meeting_note(db: State<Db>, note: MeetingNoteInput) -> Result<MeetingNote, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let notes = note.notes.unwrap_or_default();

    if let Some(id) = note.id {
        conn.execute(
            "UPDATE meeting_notes SET title = ?1, meeting_date = ?2, attendees = ?3, notes = ?4 WHERE id = ?5",
            params![note.title, note.meeting_date, note.attendees, notes, id],
        )
        .map_err(|e| e.to_string())?;

        let created_at: String = conn
            .query_row("SELECT created_at FROM meeting_notes WHERE id = ?1", [&id], |r| r.get(0))
            .map_err(|e| e.to_string())?;

        Ok(MeetingNote {
            id,
            project_id: note.project_id,
            title: note.title,
            meeting_date: note.meeting_date,
            attendees: note.attendees,
            notes,
            created_at,
        })
    } else {
        let id = Uuid::new_v4().to_string();
        let created_at = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO meeting_notes (id, project_id, title, meeting_date, attendees, notes, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, note.project_id, note.title, note.meeting_date, note.attendees, notes, created_at],
        )
        .map_err(|e| e.to_string())?;

        Ok(MeetingNote {
            id,
            project_id: note.project_id,
            title: note.title,
            meeting_date: note.meeting_date,
            attendees: note.attendees,
            notes,
            created_at,
        })
    }
}

#[tauri::command]
pub fn list_meeting_notes(db: State<Db>, project_id: String) -> Result<Vec<MeetingNote>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, title, meeting_date, attendees, notes, created_at
             FROM meeting_notes WHERE project_id = ?1 ORDER BY meeting_date DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([project_id], |row| {
            Ok(MeetingNote {
                id: row.get(0)?,
                project_id: row.get(1)?,
                title: row.get(2)?,
                meeting_date: row.get(3)?,
                attendees: row.get(4)?,
                notes: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
