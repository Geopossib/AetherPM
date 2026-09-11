import { useEffect, useState, Fragment } from "react";
import { Plus, Wrench } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { api, Risk, RiskLevel, Task, TraceLink } from "@/lib/api";

const LEVELS: RiskLevel[] = ["Low", "Medium", "High", "Critical"];

function severityColor(likelihood: RiskLevel, impact: RiskLevel) {
  const score = LEVELS.indexOf(likelihood) + LEVELS.indexOf(impact);
  if (score >= 5) return "var(--status-danger)";
  if (score >= 3) return "var(--status-warning)";
  return "var(--status-success)";
}

export function RiskRegisterView() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mitigations, setMitigations] = useState<TraceLink[]>([]);
  const [linkingRiskId, setLinkingRiskId] = useState<string | null>(null);

  const refresh = () => {
    if (!currentProjectId) return;
    api.listRisks(currentProjectId).then(setRisks).catch(console.error);
    api.listTasks(currentProjectId).then(setTasks).catch(console.error);
    api.listTraceLinks(currentProjectId).then((links) => setMitigations(links.filter((l) => l.target_type === "risk"))).catch(console.error);
  };
  useEffect(refresh, [currentProjectId]);

  const addRisk = async () => {
    if (!currentProjectId) return;
    const title = window.prompt("Risk title");
    if (!title) return;
    await api.saveRisk({ project_id: currentProjectId, title, likelihood: "Medium", impact: "Medium", status: "Open" });
    refresh();
  };

  const linkMitigation = async (taskId: string) => {
    if (!currentProjectId || !linkingRiskId || !taskId) return;
    await api.createTraceLink({ project_id: currentProjectId, source_type: "task", source_id: taskId, target_type: "risk", target_id: linkingRiskId, relation: "mitigates" });
    setLinkingRiskId(null);
    refresh();
  };

  if (!currentProjectId) {
    return <div style={{ padding: "var(--space-6)", color: "var(--text-secondary)" }}>Select a project first.</div>;
  }

  // Bucket risks into the 4x4 matrix by [likelihood][impact].
  const matrix: Record<string, Risk[]> = {};
  for (const r of risks) {
    const key = `${r.likelihood}-${r.impact}`;
    (matrix[key] ??= []).push(r);
  }

  return (
    <div style={{ padding: "var(--space-5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Risk Register</h1>
        <button
          onClick={addRisk}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--accent-dim)", color: "var(--accent-text)", borderRadius: "var(--radius-sm)", fontSize: 12 }}
        >
          <Plus size={14} /> New risk
        </button>
      </div>

      {/* Likelihood x Impact matrix */}
      <div style={{ display: "grid", gridTemplateColumns: "70px repeat(4, 1fr)", gap: 4, marginBottom: 28, maxWidth: 560 }}>
        <div />
        {LEVELS.map((impact) => (
          <div key={impact} style={{ textAlign: "center", fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase" as const }}>
            {impact}
          </div>
        ))}
        {[...LEVELS].reverse().map((likelihood) => (
          <Fragment key={likelihood}>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}>
              {likelihood}
            </div>
            {LEVELS.map((impact) => {
              const cellRisks = matrix[`${likelihood}-${impact}`] || [];
              return (
                <div
                  key={impact}
                  title={cellRisks.map((r) => r.title).join(", ")}
                  style={{
                    height: 44,
                    borderRadius: 4,
                    background: severityColor(likelihood, impact),
                    opacity: cellRisks.length > 0 ? 0.85 : 0.18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#08131a",
                  }}
                >
                  {cellRisks.length > 0 ? cellRisks.length : ""}
                </div>
              );
            })}
          </Fragment>
        ))}
        <div />
        <div style={{ gridColumn: "2 / span 4", textAlign: "center", fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>
          Impact →&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↑ Likelihood
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--text-tertiary)", fontSize: 11, textTransform: "uppercase" as const }}>
            <th style={{ padding: "6px 8px" }}>Risk</th>
            <th style={{ padding: "6px 8px" }}>Likelihood</th>
            <th style={{ padding: "6px 8px" }}>Impact</th>
            <th style={{ padding: "6px 8px" }}>Status</th>
            <th style={{ padding: "6px 8px" }}>Owner</th>
            <th style={{ padding: "6px 8px" }}>Mitigation</th>
          </tr>
        </thead>
        <tbody>
          {risks.map((r) => {
            const mitigation = mitigations.find((m) => m.target_id === r.id);
            const mitigationTask = mitigation ? tasks.find((t) => t.id === mitigation.source_id) : null;
            return (
            <tr key={r.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <td style={{ padding: "8px" }}>{r.title}</td>
              <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{r.likelihood}</td>
              <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{r.impact}</td>
              <td style={{ padding: "8px" }}>
                <span
                  style={{
                    fontSize: 11,
                    padding: "1px 8px",
                    borderRadius: 10,
                    border: "1px solid var(--border-strong)",
                    color: r.status === "Open" ? "var(--status-danger)" : r.status === "Closed" ? "var(--status-success)" : "var(--text-secondary)",
                  }}
                >
                  {r.status}
                </span>
              </td>
              <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{r.owner_name || "—"}</td>
              <td style={{ padding: "8px" }}>
                {mitigationTask ? (
                  <span style={{ fontSize: 12, color: "var(--status-success)" }}>{mitigationTask.title}</span>
                ) : linkingRiskId === r.id ? (
                  <select autoFocus onChange={(e) => linkMitigation(e.target.value)} onBlur={() => setLinkingRiskId(null)} value="" style={{ fontSize: 12 }}>
                    <option value="">Select task…</option>
                    {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                ) : (
                  <button onClick={() => setLinkingRiskId(r.id)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--accent-text)" }}>
                    <Wrench size={12} /> Link task
                  </button>
                )}
              </td>
            </tr>
          );})}
          {risks.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: "24px 8px", color: "var(--text-tertiary)", textAlign: "center" }}>
                No risks logged yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
