use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct SysmlElementInput {
    pub id: Option<String>,
    pub project_id: String,
    pub element_type: String, // block | port | actor | use_case | activity | requirement_ref
    pub name: String,
    pub package: Option<String>,
    pub properties: Option<String>, // JSON blob, e.g. {"stereotype": "sensor"}
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SysmlElement {
    pub id: String,
    pub project_id: String,
    pub element_type: String,
    pub name: String,
    pub package: Option<String>,
    pub properties: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Diagram {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub diagram_type: String, // Requirements | BDD | IBD | UseCase | Activity
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiagramNode {
    pub id: String,
    pub diagram_id: String,
    pub element_id: Option<String>,
    pub label: String,
    pub pos_x: f64,
    pub pos_y: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiagramEdge {
    pub id: String,
    pub diagram_id: String,
    pub source_node_id: String,
    pub target_node_id: String,
    pub label: Option<String>,
}

/// Full payload for rendering/saving one diagram's canvas in one round trip.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiagramDetail {
    pub diagram: Diagram,
    pub nodes: Vec<DiagramNode>,
    pub edges: Vec<DiagramEdge>,
}

/// What the canvas sends back on save: node positions/labels may have
/// changed, edges may have been added/removed, and any brand-new node
/// carries a client-generated element_id to link to (or None).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiagramNodeInput {
    pub element_id: Option<String>,
    pub label: String,
    pub pos_x: f64,
    pub pos_y: f64,
    /// Client-side id (e.g. "1", "2" from React Flow) used only to
    /// resolve edge source/target within this save call.
    pub client_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiagramEdgeInput {
    pub source_client_id: String,
    pub target_client_id: String,
    pub label: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValidationIssue {
    pub rule: String,
    pub severity: String, // info | warning | error
    pub message: String,
    pub entity_type: String,
    pub entity_id: String,
}
