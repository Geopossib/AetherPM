import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { api, Task } from "@/lib/api";
import { InspectorDrawer } from "@/components/InspectorDrawer";
import { CommentThread } from "@/components/CommentThread";
import { AttachmentsList } from "@/components/AttachmentsList";
import { TaskDependencies } from "@/components/TaskDependencies";
import { TaskEditForm } from "./TaskEditForm";
import { FilterBar, BoardFilter, EMPTY_FILTER } from "./FilterBar";

const COLUMNS: Task["status"][] = ["Backlog", "Todo", "InProgress", "Review", "Done"];
const COLUMN_LABELS: Record<Task["status"], string> = {
  Backlog: "Backlog",
  Todo: "To do",
  InProgress: "In progress",
  Review: "Review",
  Done: "Done",
};

export function BoardView() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<BoardFilter>(EMPTY_FILTER);
  const [searchParams, setSearchParams] = useSearchParams();

  const refresh = () => {
    if (currentProjectId) api.listTasks(currentProjectId).then(setTasks).catch(console.error);
  };

  useEffect(refresh, [currentProjectId]);

  // Deep-link support: Command Palette search results land here as
  // /board?openTask=<id>, which opens that task's inspector drawer.
  useEffect(() => {
    const openId = searchParams.get("openTask");
    if (openId && tasks.some((t) => t.id === openId)) {
      setOpenTaskId(openId);
      searchParams.delete("openTask");
      setSearchParams(searchParams, { replace: true });
    }
  }, [tasks, searchParams, setSearchParams]);

  const addTask = async (status: Task["status"]) => {
    if (!currentProjectId) return;
    const title = window.prompt("Task title");
    if (!title) return;
    const dueDateRaw = window.prompt("Due date (YYYY-MM-DD), or leave blank");
    const due_date = dueDateRaw ? new Date(dueDateRaw).toISOString() : null;
    const tagsRaw = window.prompt("Tags, comma-separated (optional)");
    const tags = tagsRaw?.trim() ? tagsRaw.trim() : null;
    await api.saveTask({ project_id: currentProjectId, title, status, priority: "Medium", due_date, tags });
    refresh();
  };

  if (!currentProjectId) {
    return <div style={{ padding: "var(--space-6)", color: "var(--text-secondary)" }}>Select a project first.</div>;
  }

  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;
  const visibleTasks = tasks.filter(
    (t) =>
      (!filter.priority || t.priority === filter.priority) &&
      (!filter.assignee || t.assignee_name === filter.assignee) &&
      (!filter.tag || (t.tags ?? "").toLowerCase().includes(filter.tag.toLowerCase()))
  );
  const assignees = Array.from(new Set(tasks.map((t) => t.assignee_name).filter((a): a is string => !!a)));

  return (
    <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "var(--space-4) 0 0" }}>
        <FilterBar projectId={currentProjectId} filter={filter} onChange={setFilter} assignees={assignees} />
      </div>
      <div style={{ display: "flex", gap: "var(--space-4)", padding: "var(--space-4) var(--space-5) var(--space-5)", flex: 1, overflowX: "auto" }}>
        {COLUMNS.map((status) => (
          <div
            key={status}
            style={{
              minWidth: 260,
              display: "flex",
              flexDirection: "column",
              background: "var(--bg-inset)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                borderBottom: "1px solid var(--border-subtle)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              <span>
                {COLUMN_LABELS[status]} · {visibleTasks.filter((t) => t.status === status).length}
              </span>
              <button onClick={() => addTask(status)} title="Add task" style={{ color: "var(--text-tertiary)" }}>
                <Plus size={14} />
              </button>
            </div>
            <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
              {visibleTasks
                .filter((t) => t.status === status)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setOpenTaskId(t.id)}
                    style={{
                      display: "block",
                      textAlign: "left",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      padding: "10px 10px",
                      fontSize: 13,
                    }}
                  >
                    <div>{t.title}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          padding: "1px 6px",
                          borderRadius: 3,
                          border: "1px solid var(--border-strong)",
                          color:
                            t.priority === "Critical"
                              ? "var(--status-danger)"
                              : t.priority === "High"
                              ? "var(--status-warning)"
                              : "var(--text-tertiary)",
                        }}
                      >
                        {t.priority}
                      </span>
                      {t.assignee_name && <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{t.assignee_name}</span>}
                    </div>
                    {t.tags && (
                      <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {t.tags.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                          <span key={tag} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "var(--bg-inset)", color: "var(--text-tertiary)" }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      {openTask && (
        <InspectorDrawer title={openTask.title} subtitle={`${openTask.status} · ${openTask.priority} priority`} onClose={() => setOpenTaskId(null)}>
          <div style={{ marginBottom: 20 }}>
            <TaskEditForm task={openTask} onSaved={refresh} />
          </div>
          <TaskDependencies projectId={openTask.project_id} task={openTask} allTasks={tasks} />
          <div style={{ marginBottom: 20 }}>
            <AttachmentsList projectId={openTask.project_id} entityType="task" entityId={openTask.id} />
          </div>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Comments</h3>
          <CommentThread projectId={openTask.project_id} entityType="task" entityId={openTask.id} />
        </InspectorDrawer>
      )}
    </div>
  );
}
