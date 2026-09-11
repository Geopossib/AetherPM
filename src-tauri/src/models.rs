use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub project_type: String,
    pub archived: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct TaskInput {
    pub id: Option<String>,
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub parent_task_id: Option<String>,
    pub estimate_hours: Option<f64>,
    pub actual_hours: Option<f64>,
    pub due_date: Option<String>,
    pub start_date: Option<String>,
    pub assignee_name: Option<String>,
    pub sprint_id: Option<String>,
    pub tags: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub parent_task_id: Option<String>,
    pub estimate_hours: Option<f64>,
    pub actual_hours: Option<f64>,
    pub due_date: Option<String>,
    pub start_date: Option<String>,
    pub assignee_name: Option<String>,
    pub sprint_id: Option<String>,
    pub tags: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct RequirementInput {
    pub id: Option<String>,
    pub project_id: String,
    pub statement: String,
    pub req_type: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub verification_method: Option<String>,
    pub parent_requirement_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Requirement {
    pub id: String,
    pub project_id: String,
    pub req_key: String,
    pub statement: String,
    pub req_type: String,
    pub status: String,
    pub priority: String,
    pub verification_method: String,
    pub parent_requirement_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TraceLink {
    pub id: String,
    pub project_id: String,
    pub source_type: String,
    pub source_id: String,
    pub target_type: String,
    pub target_id: String,
    pub relation: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResult {
    pub entity_type: String,
    pub entity_id: String,
    pub project_id: String,
    pub title: String,
    pub snippet: String,
}

/// Full export/import package for a project: every row that belongs
/// to it, bundled as one JSON document. Kept intentionally flat so a
/// non-technical user can open it and roughly understand it.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectExport {
    pub project: Project,
    pub tasks: Vec<Task>,
    pub requirements: Vec<Requirement>,
    pub trace_links: Vec<TraceLink>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct MilestoneInput {
    pub id: Option<String>,
    pub project_id: String,
    pub name: String,
    pub description: Option<String>,
    pub due_date: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Milestone {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub description: Option<String>,
    pub due_date: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct RiskInput {
    pub id: Option<String>,
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub likelihood: Option<String>,
    pub impact: Option<String>,
    pub status: Option<String>,
    pub owner_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Risk {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub likelihood: String,
    pub impact: String,
    pub status: String,
    pub owner_name: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct DecisionInput {
    pub id: Option<String>,
    pub project_id: String,
    pub title: String,
    pub decision: String,
    pub rationale: Option<String>,
    pub status: Option<String>,
    pub decided_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Decision {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub decision: String,
    pub rationale: Option<String>,
    pub status: String,
    pub decided_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct MeetingNoteInput {
    pub id: Option<String>,
    pub project_id: String,
    pub title: String,
    pub meeting_date: String,
    pub attendees: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MeetingNote {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub meeting_date: String,
    pub attendees: Option<String>,
    pub notes: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Baseline {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BaselineComparison {
    pub baseline: Baseline,
    pub tasks_added_since: i64,
    pub tasks_completed_since: i64,
    pub tasks_overdue_now: i64,
}
