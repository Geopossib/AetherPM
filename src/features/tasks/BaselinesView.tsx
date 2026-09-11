import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, GitCommitHorizontal } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { api, Baseline, BaselineComparison } from "@/lib/api";

export function BaselinesView() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [comparisons, setComparisons] = useState<Record<string, BaselineComparison>>({});

  const refresh = () => {
    if (currentProjectId) api.listBaselines(currentProjectId).then(setBaselines).catch(console.error);
  };
  useEffect(refresh, [currentProjectId]);

  const loadComparison = async (id: string) => {
    const comparison = await api.compareBaseline(id);
    setComparisons((prev) => ({ ...prev, [id]: comparison }));
  };

  const addBaseline = async () => {
    if (!currentProjectId) return;
    const name = window.prompt("Baseline name", `Baseline ${format(new Date(), "MMM d")}`);
    if (!name) return;
    await api.createBaseline(currentProjectId, name);
    refresh();
  };

  if (!currentProjectId) {
    return <div style={{ padding: "var(--space-6)", color: "var(--text-secondary)" }}>Select a project first.</div>;
  }

  return (
    <div style={{ padding: "var(--space-5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Baselines</h2>
        <button
          onClick={addBaseline}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--accent-dim)", color: "var(--accent-text)", borderRadius: "var(--radius-sm)", fontSize: 12 }}
        >
          <Plus size={14} /> Snapshot current plan
        </button>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 16 }}>
        A baseline freezes today's tasks so you can see what's changed since — new work added, what's finished, what's now overdue.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {baselines.map((b) => {
          const cmp = comparisons[b.id];
          return (
            <div key={b.id} style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <GitCommitHorizontal size={14} color="var(--accent)" />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{b.name}</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{format(new Date(b.created_at), "PPp")}</span>
              </div>

              {cmp ? (
                <div style={{ display: "flex", gap: 20, marginTop: 10, fontSize: 12 }}>
                  <span>
                    <span className="mono" style={{ color: "var(--status-info)" }}>{cmp.tasks_added_since}</span>{" "}
                    <span style={{ color: "var(--text-tertiary)" }}>added since</span>
                  </span>
                  <span>
                    <span className="mono" style={{ color: "var(--status-success)" }}>{cmp.tasks_completed_since}</span>{" "}
                    <span style={{ color: "var(--text-tertiary)" }}>completed since</span>
                  </span>
                  <span>
                    <span className="mono" style={{ color: cmp.tasks_overdue_now > 0 ? "var(--status-danger)" : "var(--text-tertiary)" }}>
                      {cmp.tasks_overdue_now}
                    </span>{" "}
                    <span style={{ color: "var(--text-tertiary)" }}>overdue now</span>
                  </span>
                </div>
              ) : (
                <button onClick={() => loadComparison(b.id)} style={{ marginTop: 8, fontSize: 12, color: "var(--accent-text)" }}>
                  Compare to current plan →
                </button>
              )}
            </div>
          );
        })}
        {baselines.length === 0 && <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>No baselines yet.</p>}
      </div>
    </div>
  );
}
