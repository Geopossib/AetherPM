import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, ScrollText } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { api, Decision } from "@/lib/api";

export function DecisionLogView() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const [decisions, setDecisions] = useState<Decision[]>([]);

  const refresh = () => {
    if (currentProjectId) api.listDecisions(currentProjectId).then(setDecisions).catch(console.error);
  };
  useEffect(refresh, [currentProjectId]);

  const addDecision = async () => {
    if (!currentProjectId) return;
    const title = window.prompt("What was this decision about?");
    if (!title) return;
    const decision = window.prompt("What was decided?");
    if (!decision) return;
    const rationale = window.prompt("Why? (optional)") || null;
    await api.saveDecision({ project_id: currentProjectId, title, decision, rationale, status: "Decided", decided_at: new Date().toISOString() });
    refresh();
  };

  if (!currentProjectId) {
    return <div style={{ padding: "var(--space-6)", color: "var(--text-secondary)" }}>Select a project first.</div>;
  }

  return (
    <div style={{ padding: "var(--space-5)", maxWidth: 720 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Decision Log</h1>
        <button
          onClick={addDecision}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--accent-dim)", color: "var(--accent-text)", borderRadius: "var(--radius-sm)", fontSize: 12 }}
        >
          <Plus size={14} /> Log decision
        </button>
      </div>

      {decisions.length === 0 && (
        <div style={{ color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 8 }}>
          <ScrollText size={16} /> No decisions logged yet — this is where irreversible or hard-to-reverse calls get a paper trail.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {decisions.map((d) => (
          <div key={d.id} style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: 14, background: "var(--bg-surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{d.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {d.decided_at ? format(new Date(d.decided_at), "PP") : format(new Date(d.created_at), "PP")}
              </div>
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>{d.decision}</div>
            {d.rationale && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>Why: {d.rationale}</div>}
            <span
              style={{
                display: "inline-block",
                marginTop: 8,
                fontSize: 10,
                padding: "1px 8px",
                borderRadius: 10,
                border: "1px solid var(--border-strong)",
                color: d.status === "Reversed" ? "var(--status-danger)" : "var(--text-secondary)",
              }}
            >
              {d.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
