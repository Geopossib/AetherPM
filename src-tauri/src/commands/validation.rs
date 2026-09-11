use crate::db::Db;
use crate::models_sysml::ValidationIssue;
use tauri::State;

#[tauri::command]
pub fn validate_project(db: State<Db>, project_id: String) -> Result<Vec<ValidationIssue>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut issues = Vec::new();

    // Rule 1: requirement with no trace link on either side.
    let mut orphan_stmt = conn
        .prepare(
            "SELECT id, req_key FROM requirements WHERE project_id = ?1
             AND id NOT IN (
                SELECT source_id FROM trace_links WHERE project_id = ?1 AND source_type = 'requirement'
                UNION
                SELECT target_id FROM trace_links WHERE project_id = ?1 AND target_type = 'requirement'
             )",
        )
        .map_err(|e| e.to_string())?;
    let orphan_rows = orphan_stmt
        .query_map([&project_id], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;
    for r in orphan_rows {
        let (id, key) = r.map_err(|e| e.to_string())?;
        issues.push(ValidationIssue {
            rule: "orphan_requirement".into(),
            severity: "warning".into(),
            message: format!("{key} has no trace links — nothing satisfies it or is verified by it."),
            entity_type: "requirement".into(),
            entity_id: id,
        });
    }

    // Rule 2: open risk with no owner assigned.
    let mut unowned_stmt = conn
        .prepare("SELECT id, title FROM risks WHERE project_id = ?1 AND status = 'Open' AND (owner_name IS NULL OR owner_name = '')")
        .map_err(|e| e.to_string())?;
    let unowned_rows = unowned_stmt
        .query_map([&project_id], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;
    for r in unowned_rows {
        let (id, title) = r.map_err(|e| e.to_string())?;
        issues.push(ValidationIssue {
            rule: "uncovered_risk".into(),
            severity: "warning".into(),
            message: format!("Risk \"{title}\" is open with no owner."),
            entity_type: "risk".into(),
            entity_id: id,
        });
    }

    // Rule 3: high/critical risk with no mitigating task trace link.
    let mut high_risk_stmt = conn
        .prepare(
            "SELECT id, title FROM risks WHERE project_id = ?1 AND status = 'Open'
             AND (impact = 'High' OR impact = 'Critical')
             AND id NOT IN (SELECT target_id FROM trace_links WHERE project_id = ?1 AND target_type = 'risk')",
        )
        .map_err(|e| e.to_string())?;
    let high_risk_rows = high_risk_stmt
        .query_map([&project_id], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;
    for r in high_risk_rows {
        let (id, title) = r.map_err(|e| e.to_string())?;
        issues.push(ValidationIssue {
            rule: "unmitigated_high_risk".into(),
            severity: "error".into(),
            message: format!("High/critical risk \"{title}\" has no linked mitigation task."),
            entity_type: "risk".into(),
            entity_id: id,
        });
    }

    // Rule 4: a SysML block that appears in no diagram at all.
    let mut unmodeled_stmt = conn
        .prepare(
            "SELECT id, name FROM sysml_elements WHERE project_id = ?1 AND element_type = 'block'
             AND id NOT IN (SELECT element_id FROM diagram_nodes WHERE element_id IS NOT NULL)",
        )
        .map_err(|e| e.to_string())?;
    let unmodeled_rows = unmodeled_stmt
        .query_map([&project_id], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;
    for r in unmodeled_rows {
        let (id, name) = r.map_err(|e| e.to_string())?;
        issues.push(ValidationIssue {
            rule: "unmodeled_block".into(),
            severity: "info".into(),
            message: format!("Block \"{name}\" exists but isn't placed on any diagram."),
            entity_type: "sysml_element".into(),
            entity_id: id,
        });
    }

    Ok(issues)
}
