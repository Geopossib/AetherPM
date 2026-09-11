import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAppStore } from "@/stores/appStore";
import { api, Task, Requirement, ValidationIssue, ActivityEvent } from "@/lib/api";

function Card({ label, value, tone }: { label: string; value: string | number; tone?: "warning" | "danger" | "success" }) {
  const color = tone ? `var(--status-${tone})` : "var(--text-primary)";
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase" as const }}>{label}</div>
      <div className="mono" style={{ fontSize: 28, fontWeight: 600, color, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

export function DashboardView() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const projects = useAppStore((s) => s.projects);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    if (!currentProjectId) return;
    api.listTasks(currentProjectId).then(setTasks).catch(console.error);
    api.listRequirements(currentProjectId).then(setRequirements).catch(console.error);
    api.validateProject(currentProjectId).then(setIssues).catch(console.error);
    api.listActivity(currentProjectId, 20).then(setActivity).catch(console.error);
  }, [currentProjectId]);

  const project = projects.find((p) => p.id === currentProjectId);
  const done = tasks.filter((t) => t.status === "Done").length;
  const overdue = tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "Done").length;
  const unverified = requirements.filter((r) => r.status !== "Verified").length;

  if (!currentProjectId) {
    return (
      <div style={{ padding: "var(--space-6)" }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>No project selected</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Create a project to get started, or pick one from the switcher above.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--space-6)" }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{project?.name}</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 4, marginBottom: "var(--space-5)" }}>
        {project?.description || "No description yet."}
      </p>

      <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <Card label="Tasks" value={tasks.length} />
        <Card label="Completed" value={done} tone={done > 0 ? "success" : undefined} />
        <Card label="Overdue" value={overdue} tone={overdue > 0 ? "danger" : undefined} />
        <Card label="Requirements" value={requirements.length} />
        <Card label="Unverified reqs" value={unverified} tone={unverified > 0 ? "warning" : undefined} />
        <Card label="Validation issues" value={issues.length} tone={issues.some((i) => i.severity === "error") ? "danger" : issues.length > 0 ? "warning" : undefined} />
      </div>

      <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginTop: 28, marginBottom: 10 }}>Recent activity</h2>
      <div style={{ maxWidth: 480, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
        {activity.length === 0 && <div style={{ padding: 12, fontSize: 12, color: "var(--text-tertiary)" }}>Nothing yet.</div>}
        {activity.map((a) => (
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderBottom: "1px solid var(--border-subtle)", fontSize: 12 }}>
            <span>
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{a.actor_name}</span> {a.action} a {a.entity_type}
            </span>
            <span style={{ color: "var(--text-tertiary)" }}>{format(new Date(a.created_at), "MMM d, p")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
