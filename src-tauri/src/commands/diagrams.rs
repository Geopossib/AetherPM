use crate::db::Db;
use crate::models_sysml::{
    Diagram, DiagramDetail, DiagramEdge, DiagramEdgeInput, DiagramNode, DiagramNodeInput,
};
use rusqlite::params;
use std::collections::HashMap;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn create_diagram(db: State<Db>, project_id: String, name: String, diagram_type: String) -> Result<Diagram, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO diagrams (id, project_id, name, diagram_type) VALUES (?1, ?2, ?3, ?4)",
        params![id, project_id, name, diagram_type],
    )
    .map_err(|e| e.to_string())?;
    Ok(Diagram { id, project_id, name, diagram_type })
}

#[tauri::command]
pub fn list_diagrams(db: State<Db>, project_id: String) -> Result<Vec<Diagram>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, project_id, name, diagram_type FROM diagrams WHERE project_id = ?1 ORDER BY diagram_type, name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([project_id], |row| {
            Ok(Diagram {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                diagram_type: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_diagram(db: State<Db>, diagram_id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM diagrams WHERE id = ?1", [diagram_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_diagram_detail(db: State<Db>, diagram_id: String) -> Result<DiagramDetail, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let diagram = conn
        .query_row(
            "SELECT id, project_id, name, diagram_type FROM diagrams WHERE id = ?1",
            [&diagram_id],
            |row| {
                Ok(Diagram {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    name: row.get(2)?,
                    diagram_type: row.get(3)?,
                })
            },
        )
        .map_err(|e| format!("diagram not found: {e}"))?;

    let mut node_stmt = conn
        .prepare("SELECT id, diagram_id, element_id, label, pos_x, pos_y FROM diagram_nodes WHERE diagram_id = ?1")
        .map_err(|e| e.to_string())?;
    let nodes: Vec<DiagramNode> = node_stmt
        .query_map([&diagram_id], |row| {
            Ok(DiagramNode {
                id: row.get(0)?,
                diagram_id: row.get(1)?,
                element_id: row.get(2)?,
                label: row.get(3)?,
                pos_x: row.get(4)?,
                pos_y: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;

    let mut edge_stmt = conn
        .prepare("SELECT id, diagram_id, source_node_id, target_node_id, label FROM diagram_edges WHERE diagram_id = ?1")
        .map_err(|e| e.to_string())?;
    let edges: Vec<DiagramEdge> = edge_stmt
        .query_map([&diagram_id], |row| {
            Ok(DiagramEdge {
                id: row.get(0)?,
                diagram_id: row.get(1)?,
                source_node_id: row.get(2)?,
                target_node_id: row.get(3)?,
                label: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?;

    Ok(DiagramDetail { diagram, nodes, edges })
}

/// Full replace-on-save: the canvas is small enough per diagram that
/// diffing node-by-node isn't worth the complexity. Every save wipes
/// this diagram's nodes/edges and re-inserts what the client sent,
/// inside one transaction so a mid-save crash can't half-apply it.
#[tauri::command]
pub fn save_diagram_layout(
    db: State<Db>,
    diagram_id: String,
    nodes: Vec<DiagramNodeInput>,
    edges: Vec<DiagramEdgeInput>,
) -> Result<DiagramDetail, String> {
    let mut conn = db.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute("DELETE FROM diagram_edges WHERE diagram_id = ?1", [&diagram_id])
        .map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM diagram_nodes WHERE diagram_id = ?1", [&diagram_id])
        .map_err(|e| e.to_string())?;

    let mut client_to_db_id: HashMap<String, String> = HashMap::new();
    let mut saved_nodes = Vec::new();

    for n in &nodes {
        let db_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO diagram_nodes (id, diagram_id, element_id, label, pos_x, pos_y) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![db_id, diagram_id, n.element_id, n.label, n.pos_x, n.pos_y],
        )
        .map_err(|e| e.to_string())?;
        client_to_db_id.insert(n.client_id.clone(), db_id.clone());
        saved_nodes.push(DiagramNode {
            id: db_id,
            diagram_id: diagram_id.clone(),
            element_id: n.element_id.clone(),
            label: n.label.clone(),
            pos_x: n.pos_x,
            pos_y: n.pos_y,
        });
    }

    let mut saved_edges = Vec::new();
    for e in &edges {
        let (Some(source_id), Some(target_id)) = (
            client_to_db_id.get(&e.source_client_id),
            client_to_db_id.get(&e.target_client_id),
        ) else {
            continue; // skip dangling edges rather than fail the whole save
        };
        let db_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO diagram_edges (id, diagram_id, source_node_id, target_node_id, label) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![db_id, diagram_id, source_id, target_id, e.label],
        )
        .map_err(|e| e.to_string())?;
        saved_edges.push(DiagramEdge {
            id: db_id,
            diagram_id: diagram_id.clone(),
            source_node_id: source_id.clone(),
            target_node_id: target_id.clone(),
            label: e.label.clone(),
        });
    }

    tx.commit().map_err(|e| e.to_string())?;

    let diagram = conn
        .query_row(
            "SELECT id, project_id, name, diagram_type FROM diagrams WHERE id = ?1",
            [&diagram_id],
            |row| {
                Ok(Diagram {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    name: row.get(2)?,
                    diagram_type: row.get(3)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(DiagramDetail { diagram, nodes: saved_nodes, edges: saved_edges })
}
