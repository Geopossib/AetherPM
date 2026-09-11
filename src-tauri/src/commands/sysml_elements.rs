use crate::db::Db;
use crate::models_sysml::{SysmlElement, SysmlElementInput};
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn save_sysml_element(db: State<Db>, element: SysmlElementInput) -> Result<SysmlElement, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    if let Some(id) = element.id {
        conn.execute(
            "UPDATE sysml_elements SET element_type = ?1, name = ?2, package = ?3, properties = ?4 WHERE id = ?5",
            params![element.element_type, element.name, element.package, element.properties, id],
        )
        .map_err(|e| e.to_string())?;

        Ok(SysmlElement {
            id,
            project_id: element.project_id,
            element_type: element.element_type,
            name: element.name,
            package: element.package,
            properties: element.properties,
        })
    } else {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO sysml_elements (id, project_id, element_type, name, package, properties)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, element.project_id, element.element_type, element.name, element.package, element.properties],
        )
        .map_err(|e| e.to_string())?;

        Ok(SysmlElement {
            id,
            project_id: element.project_id,
            element_type: element.element_type,
            name: element.name,
            package: element.package,
            properties: element.properties,
        })
    }
}

#[tauri::command]
pub fn list_sysml_elements(db: State<Db>, project_id: String) -> Result<Vec<SysmlElement>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, project_id, element_type, name, package, properties FROM sysml_elements WHERE project_id = ?1 ORDER BY package, name")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([project_id], |row| {
            Ok(SysmlElement {
                id: row.get(0)?,
                project_id: row.get(1)?,
                element_type: row.get(2)?,
                name: row.get(3)?,
                package: row.get(4)?,
                properties: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_sysml_element(db: State<Db>, element_id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM sysml_elements WHERE id = ?1", [element_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
