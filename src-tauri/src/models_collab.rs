use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct MemberInput {
    pub project_id: String,
    pub display_name: String,
    pub role: String, // Owner | Admin | Editor | Viewer
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectMember {
    pub id: String,
    pub project_id: String,
    pub user_id: String,
    pub display_name: String,
    pub role: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct CommentInput {
    pub project_id: String,
    pub entity_type: String, // task | requirement | diagram
    pub entity_id: String,
    pub body: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Comment {
    pub id: String,
    pub project_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub author_id: Option<String>,
    pub author_name: String,
    pub body: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Notification {
    pub id: String,
    pub user_id: String,
    pub project_id: Option<String>,
    pub body: String,
    pub read: bool,
    pub created_at: String,
}
