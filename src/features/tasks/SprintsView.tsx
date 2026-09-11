import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { api, Sprint, Task } from "@/lib/api";

export function SprintsView() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const refresh = () => {
    if (!currentProjectId) return;
    api.listSprints(currentProjectId).then(setSprints).catch(console.error);
    api.listTasks(currentProjectId).then(setTasks).catch(console.error);
  };
  useEffect(refresh, [currentProjectId]);

  const addSprint = async () => {
    if (!currentProjectId) return;
    const name = window.prompt("Sprint name", `Sprint ${sprints.length + 1}`);
    if (!name) return;
    const start = window.prompt("Start date (YYYY-MM-DD)", format(new Date(), "yyyy-MM-dd"));
    const end = window.prompt("End date (YYYY-MM-DD)");
    await api.saveSprint({
      project_id: currentProjectId,
      name,
      start_date: start ? new Date(start).toISOString() : null,
      end_date: end ? new Date(end).toISOString() : null,
      status: "Planned",
    });
    refresh();
  };

  const assignTask = async (task: Task, sprintId: string | null) => {
    await api.saveTask({ ...task, sprint_id: sprintId });
    refresh();
  };

  if (!currentProjectId) {
    return <div style={{ padding: "var(--space-6)", color: "var(--text-secondary)" }}>Select a project first.</div>;
  }

  const backlog = tasks.filter((t) => !t.sprint_id);

  return (
    <div style={{ padding: "var(--space-5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Sprints</h2>
        <button
          onClick={addSprint}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--accent-dim)", color: "var(--accent-text)", borderRadius: "var(--radius-sm)", fontSize: 12 }}
        >
          <Plus size={14} /> New sprint
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>
        {sprints.map((sprint) => {
          const sprintTasks = tasks.filter((t) => t.sprint_id === sprint.id);
          const done = sprintTasks.filter((t) => t.status === "Done").length;
          return (
            <div key={sprint.id} style={{ minWidth: 260, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{sprint.name}</span>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{sprint.status}</span>
              </div>
              {(sprint.start_date || sprint.end_date) && (
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                  {sprint.start_date && format(new Date(sprint.start_date), "MMM d")}
                  {sprint.start_date && sprint.end_date && " – "}
                  {sprint.end_date && format(new Date(sprint.end_date), "MMM d")}
                </div>
              )}
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6 }}>{done}/{sprintTasks.length} done</div>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {sprintTasks.map((t) => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "5px 8px", background: "var(--bg-surface)", borderRadius: "var(--radius-sm)" }}>
                    <span style={{ opacity: t.status === "Done" ? 0.5 : 1 }}>{t.title}</span>
                    <button onClick={() => assignTask(t, null)} title="Move to backlog" style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
                      ×
                    </button>
                  </div>
                ))}
                {sprintTasks.length === 0 && <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>No tasks yet.</div>}
              </div>
            </div>
          );
        })}
        {sprints.length === 0 && <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>No sprints yet.</p>}
      </div>

      <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginTop: 24, marginBottom: 8 }}>Backlog (unassigned)</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 400 }}>
        {backlog.map((t) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "6px 10px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
            <span>{t.title}</span>
            {sprints.length > 0 && (
              <select onChange={(e) => e.target.value && assignTask(t, e.target.value)} value="" style={{ fontSize: 11 }}>
                <option value="">Add to sprint…</option>
                {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
        ))}
        {backlog.length === 0 && <p style={{ color: "var(--text-tertiary)", fontSize: 12 }}>Nothing unassigned.</p>}
      </div>
    </div>
  );
}
