import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { api, Task } from "@/lib/api";

export function WorkloadView() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (currentProjectId) api.listTasks(currentProjectId).then(setTasks).catch(console.error);
  }, [currentProjectId]);

  if (!currentProjectId) {
    return <div style={{ padding: "var(--space-6)", color: "var(--text-secondary)" }}>Select a project first.</div>;
  }

  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    if (t.status === "Done") continue;
    const key = t.assignee_name?.trim() || "Unassigned";
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(t);
  }
  const maxLoad = Math.max(...Array.from(groups.values()).map((g) => g.length), 1);

  return (
    <div style={{ padding: "var(--space-5)" }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Workload</h2>
      <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 16 }}>
        Open tasks per person. Set an assignee when creating a task to populate this.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {Array.from(groups.entries()).map(([name, taskList]) => (
          <div key={name}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ fontWeight: 500 }}>{name}</span>
              <span className="mono" style={{ color: "var(--text-tertiary)" }}>{taskList.length} open</span>
            </div>
            <div style={{ height: 8, background: "var(--bg-inset)", borderRadius: 4, overflow: "hidden" }}>
              <div
                style={{
                  width: `${(taskList.length / maxLoad) * 100}%`,
                  height: "100%",
                  background: name === "Unassigned" ? "var(--text-tertiary)" : "var(--accent)",
                }}
              />
            </div>
          </div>
        ))}
        {groups.size === 0 && <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>No open tasks.</p>}
      </div>
    </div>
  );
}
