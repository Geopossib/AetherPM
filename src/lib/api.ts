// Thin, typed wrapper around Tauri's invoke() so the rest of the app
// never calls invoke() directly. Every Rust command exposed in
// src-tauri/src/commands should get one entry here, with matching
// TypeScript types for its arguments and return value.

import { invoke } from "@tauri-apps/api/core";

export type ProjectType = "General" | "Software" | "SystemsEngineering" | "Research" | "Custom";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  project_type: ProjectType;
  created_at: string;
  archived: boolean;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: "Backlog" | "Todo" | "InProgress" | "Review" | "Done";
  priority: "Low" | "Medium" | "High" | "Critical";
  parent_task_id: string | null;
  estimate_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  start_date: string | null;
  assignee_name: string | null;
  sprint_id: string | null;
  tags: string | null;
  created_at: string;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: "Planned" | "Active" | "Completed";
  created_at: string;
}

export interface SavedView {
  id: string;
  project_id: string;
  name: string;
  view_type: string;
  filter_json: string;
}

export interface ActivityEvent {
  id: string;
  project_id: string;
  actor_name: string;
  entity_type: string;
  entity_id: string;
  action: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  project_id: string;
  entity_type: string;
  entity_id: string;
  file_path: string;
  file_name: string;
  added_at: string;
}

export type TaskLinkType = "blocks" | "relates_to" | "duplicates";
export interface TaskLink {
  id: string;
  project_id: string;
  from_task_id: string;
  to_task_id: string;
  link_type: TaskLinkType;
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  due_date: string | null;
  status: "Planned" | "AtRisk" | "Achieved" | "Missed";
  created_at: string;
}

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";
export interface Risk {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  likelihood: RiskLevel;
  impact: RiskLevel;
  status: "Open" | "Mitigating" | "Closed" | "Accepted";
  owner_name: string | null;
  created_at: string;
}

export interface Decision {
  id: string;
  project_id: string;
  title: string;
  decision: string;
  rationale: string | null;
  status: "Proposed" | "Decided" | "Reversed";
  decided_at: string | null;
  created_at: string;
}

export interface MeetingNote {
  id: string;
  project_id: string;
  title: string;
  meeting_date: string;
  attendees: string | null;
  notes: string;
  created_at: string;
}

export interface Baseline {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
}

export interface BaselineComparison {
  baseline: Baseline;
  tasks_added_since: number;
  tasks_completed_since: number;
  tasks_overdue_now: number;
}

export type SysmlElementType = "block" | "port" | "actor" | "use_case" | "activity" | "requirement_ref";
export interface SysmlElement {
  id: string;
  project_id: string;
  element_type: SysmlElementType;
  name: string;
  package: string | null;
  properties: string | null;
}

export type DiagramType = "Requirements" | "BDD" | "IBD" | "UseCase" | "Activity";
export interface Diagram {
  id: string;
  project_id: string;
  name: string;
  diagram_type: DiagramType;
}

export interface DiagramNode {
  id: string;
  diagram_id: string;
  element_id: string | null;
  label: string;
  pos_x: number;
  pos_y: number;
}

export interface DiagramEdge {
  id: string;
  diagram_id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
}

export interface DiagramDetail {
  diagram: Diagram;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface DiagramNodeInput {
  element_id: string | null;
  label: string;
  pos_x: number;
  pos_y: number;
  client_id: string;
}

export interface DiagramEdgeInput {
  source_client_id: string;
  target_client_id: string;
  label: string | null;
}

export interface ValidationIssue {
  rule: string;
  severity: "info" | "warning" | "error";
  message: string;
  entity_type: string;
  entity_id: string;
}

export type Role = "Owner" | "Admin" | "Editor" | "Viewer";
export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  display_name: string;
  role: Role;
}

export interface Comment {
  id: string;
  project_id: string;
  entity_type: string;
  entity_id: string;
  author_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  project_id: string | null;
  body: string;
  read: boolean;
  created_at: string;
}

export interface Requirement {
  id: string;
  project_id: string;
  req_key: string; // human-facing id, e.g. REQ-014
  statement: string;
  req_type: "Functional" | "Performance" | "Interface" | "Constraint" | "Stakeholder";
  status: "Draft" | "Reviewed" | "Approved" | "Verified" | "Rejected";
  priority: "Low" | "Medium" | "High" | "Critical";
  verification_method: "Inspection" | "Analysis" | "Demonstration" | "Test" | "None";
  parent_requirement_id: string | null;
  created_at: string;
}

export interface TraceLink {
  id: string;
  project_id: string;
  source_type: string; // "requirement" | "block" | "task" | "test"
  source_id: string;
  target_type: string;
  target_id: string;
  relation: string; // "satisfies" | "derives" | "verifies" | "allocates"
}

export interface SearchResult {
  entity_type: string;
  entity_id: string;
  project_id: string;
  title: string;
  snippet: string;
}

export const api = {
  // Projects
  createProject: (name: string, description: string | null, projectType: ProjectType) =>
    invoke<Project>("create_project", { name, description, projectType }),
  listProjects: (includeArchived = false) =>
    invoke<Project[]>("list_projects", { includeArchived }),
  archiveProject: (projectId: string) => invoke<void>("archive_project", { projectId }),

  // Tasks
  saveTask: (task: Partial<Task> & { project_id: string; title: string }) =>
    invoke<Task>("save_task", { task }),
  listTasks: (projectId: string) => invoke<Task[]>("list_tasks", { projectId }),
  deleteTask: (taskId: string) => invoke<void>("delete_task", { taskId }),

  // Requirements
  saveRequirement: (req: Partial<Requirement> & { project_id: string; statement: string }) =>
    invoke<Requirement>("save_requirement", { req }),
  listRequirements: (projectId: string) => invoke<Requirement[]>("list_requirements", { projectId }),

  // Traceability
  createTraceLink: (link: Omit<TraceLink, "id">) => invoke<TraceLink>("create_trace_link", { link }),
  listTraceLinks: (projectId: string) => invoke<TraceLink[]>("list_trace_links", { projectId }),
  findOrphanRequirements: (projectId: string) => invoke<Requirement[]>("find_orphan_requirements", { projectId }),

  // Search
  searchAll: (projectId: string, query: string) => invoke<SearchResult[]>("search_all", { projectId, query }),

  // Import / export
  exportProject: (projectId: string, destPath: string) => invoke<void>("export_project", { projectId, destPath }),
  importProject: (srcPath: string) => invoke<Project>("import_project", { srcPath }),

  // Milestones
  saveMilestone: (m: Partial<Milestone> & { project_id: string; name: string }) => invoke<Milestone>("save_milestone", { milestone: m }),
  listMilestones: (projectId: string) => invoke<Milestone[]>("list_milestones", { projectId }),
  deleteMilestone: (milestoneId: string) => invoke<void>("delete_milestone", { milestoneId }),

  // Risks
  saveRisk: (r: Partial<Risk> & { project_id: string; title: string }) => invoke<Risk>("save_risk", { risk: r }),
  listRisks: (projectId: string) => invoke<Risk[]>("list_risks", { projectId }),

  // Decisions
  saveDecision: (d: Partial<Decision> & { project_id: string; title: string; decision: string }) =>
    invoke<Decision>("save_decision", { decision: d }),
  listDecisions: (projectId: string) => invoke<Decision[]>("list_decisions", { projectId }),

  // Meeting notes
  saveMeetingNote: (n: Partial<MeetingNote> & { project_id: string; title: string; meeting_date: string }) =>
    invoke<MeetingNote>("save_meeting_note", { note: n }),
  listMeetingNotes: (projectId: string) => invoke<MeetingNote[]>("list_meeting_notes", { projectId }),

  // Baselines
  createBaseline: (projectId: string, name: string) => invoke<Baseline>("create_baseline", { projectId, name }),
  listBaselines: (projectId: string) => invoke<Baseline[]>("list_baselines", { projectId }),
  compareBaseline: (baselineId: string) => invoke<BaselineComparison>("compare_baseline", { baselineId }),

  // SysML elements
  saveSysmlElement: (e: Partial<SysmlElement> & { project_id: string; element_type: SysmlElementType; name: string }) =>
    invoke<SysmlElement>("save_sysml_element", { element: e }),
  listSysmlElements: (projectId: string) => invoke<SysmlElement[]>("list_sysml_elements", { projectId }),
  deleteSysmlElement: (elementId: string) => invoke<void>("delete_sysml_element", { elementId }),

  // Diagrams
  createDiagram: (projectId: string, name: string, diagramType: DiagramType) =>
    invoke<Diagram>("create_diagram", { projectId, name, diagramType }),
  listDiagrams: (projectId: string) => invoke<Diagram[]>("list_diagrams", { projectId }),
  deleteDiagram: (diagramId: string) => invoke<void>("delete_diagram", { diagramId }),
  getDiagramDetail: (diagramId: string) => invoke<DiagramDetail>("get_diagram_detail", { diagramId }),
  saveDiagramLayout: (diagramId: string, nodes: DiagramNodeInput[], edges: DiagramEdgeInput[]) =>
    invoke<DiagramDetail>("save_diagram_layout", { diagramId, nodes, edges }),

  // Validation
  validateProject: (projectId: string) => invoke<ValidationIssue[]>("validate_project", { projectId }),

  // Members / roles
  listMembers: (projectId: string) => invoke<ProjectMember[]>("list_members", { projectId }),
  addMember: (projectId: string, displayName: string, role: Role) => invoke<ProjectMember>("add_member", { member: { project_id: projectId, display_name: displayName, role } }),
  updateMemberRole: (memberId: string, role: Role) => invoke<void>("update_member_role", { memberId, role }),
  removeMember: (memberId: string) => invoke<void>("remove_member", { memberId }),

  // Comments
  saveComment: (projectId: string, entityType: string, entityId: string, body: string) =>
    invoke<Comment>("save_comment", { comment: { project_id: projectId, entity_type: entityType, entity_id: entityId, body } }),
  listComments: (projectId: string, entityType: string, entityId: string) =>
    invoke<Comment[]>("list_comments", { projectId, entityType, entityId }),

  // Notifications
  listNotifications: () => invoke<AppNotification[]>("list_notifications"),
  markNotificationRead: (id: string) => invoke<void>("mark_notification_read", { notificationId: id }),
  markAllNotificationsRead: () => invoke<void>("mark_all_notifications_read"),

  // Sprints
  saveSprint: (s: Partial<Sprint> & { project_id: string; name: string }) => invoke<Sprint>("save_sprint", { sprint: s }),
  listSprints: (projectId: string) => invoke<Sprint[]>("list_sprints", { projectId }),
  deleteSprint: (sprintId: string) => invoke<void>("delete_sprint", { sprintId }),

  // Saved views
  saveView: (projectId: string, name: string, viewType: string, filterJson: string) =>
    invoke<SavedView>("save_view", { projectId, name, viewType, filterJson }),
  listViews: (projectId: string, viewType: string) => invoke<SavedView[]>("list_views", { projectId, viewType }),
  deleteView: (viewId: string) => invoke<void>("delete_view", { viewId }),

  // Activity
  listActivity: (projectId: string, limit = 30) => invoke<ActivityEvent[]>("list_activity", { projectId, limit }),

  // Attachments
  addAttachment: (projectId: string, entityType: string, entityId: string, filePath: string, fileName: string) =>
    invoke<Attachment>("add_attachment", { projectId, entityType, entityId, filePath, fileName }),
  listAttachments: (projectId: string, entityType: string, entityId: string) =>
    invoke<Attachment[]>("list_attachments", { projectId, entityType, entityId }),
  deleteAttachment: (attachmentId: string) => invoke<void>("delete_attachment", { attachmentId }),

  // Task dependency links
  createTaskLink: (projectId: string, fromTaskId: string, toTaskId: string, linkType: TaskLinkType) =>
    invoke<TaskLink>("create_task_link", { projectId, fromTaskId, toTaskId, linkType }),
  listTaskLinks: (projectId: string) => invoke<TaskLink[]>("list_task_links", { projectId }),
  deleteTaskLink: (linkId: string) => invoke<void>("delete_task_link", { linkId }),
};
