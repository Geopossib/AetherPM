import { useEffect, useState } from "react";
import { GitBranch, Plus, X } from "lucide-react";
import { api, Task, TaskLink, TaskLinkType } from "@/lib/api";

const LINK_LABELS: Record<TaskLinkType, string> = {
  blocks: "blocks",
  relates_to: "relates to",
  duplicates: "duplicates",
};

export function TaskDependencies({ projectId, task, allTasks }: { projectId: string; task: Task; allTasks: Task[] }) {
  const [links, setLinks] = useState<TaskLink[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [linkType, setLinkType] = useState<TaskLinkType>("blocks");

  const refresh = () => api.listTaskLinks(projectId).then(setLinks).catch(console.error);
  useEffect(refresh, [projectId]);

  const relevant = links.filter((l) => l.from_task_id === task.id || l.to_task_id === task.id);
  const otherTasks = allTasks.filter((t) => t.id !== task.id);
  const titleFor = (id: string) => allTasks.find((t) => t.id === id)?.title ?? "Unknown task";

  const addLink = async () => {
    if (!targetId) return;
    await api.createTaskLink(projectId, task.id, targetId, linkType);
    setShowForm(false);
    setTargetId("");
    refresh();
  };

  const removeLink = async (id: string) => {
    await api.deleteTaskLink(id);
    refresh();
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <GitBranch size={13} /> Dependencies
        </h3>
        <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--accent-text)" }}>
          <Plus size={12} /> Link task
        </button>
      </div>

      {showForm && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, padding: 8, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
          <select value={linkType} onChange={(e) => setLinkType(e.target.value as TaskLinkType)} style={{ fontSize: 12 }}>
            {Object.entries(LINK_LABELS).map(([k, label]) => <option key={k} value={k}>this {label}</option>)}
          </select>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={{ fontSize: 12, flex: 1, minWidth: 100 }}>
            <option value="">Select task…</option>
            {otherTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <button onClick={addLink} disabled={!targetId} style={{ padding: "4px 10px", background: "var(--accent)", color: "#08131a", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 600 }}>
            Add
          </button>
        </div>
      )}

      {relevant.length === 0 && <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No dependencies.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {relevant.map((l) => {
          const isSource = l.from_task_id === task.id;
          const otherId = isSource ? l.to_task_id : l.from_task_id;
          return (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "6px 8px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
              <span>
                {isSource ? LINK_LABELS[l.link_type] : `is ${LINK_LABELS[l.link_type]} by`} <strong>{titleFor(otherId)}</strong>
              </span>
              <button onClick={() => removeLink(l.id)} style={{ color: "var(--text-tertiary)" }}>
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
