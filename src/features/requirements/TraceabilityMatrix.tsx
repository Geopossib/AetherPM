import { useEffect, useState } from "react";
import { Link2, Plus, X } from "lucide-react";
import { api, Requirement, TraceLink, SysmlElement, Task } from "@/lib/api";

const RELATIONS = ["satisfies", "derives", "verifies", "allocates"] as const;

export function TraceabilityMatrix({ projectId, requirements }: { projectId: string; requirements: Requirement[] }) {
  const [links, setLinks] = useState<TraceLink[]>([]);
  const [blocks, setBlocks] = useState<SysmlElement[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [reqId, setReqId] = useState("");
  const [targetType, setTargetType] = useState<"block" | "task">("block");
  const [targetId, setTargetId] = useState("");
  const [relation, setRelation] = useState<(typeof RELATIONS)[number]>("satisfies");

  const refresh = () => {
    api.listTraceLinks(projectId).then(setLinks).catch(console.error);
    api.listSysmlElements(projectId).then((els) => setBlocks(els.filter((e) => e.element_type === "block"))).catch(console.error);
    api.listTasks(projectId).then(setTasks).catch(console.error);
  };
  useEffect(refresh, [projectId]);

  const labelFor = (type: string, id: string) => {
    if (type === "requirement") return requirements.find((r) => r.id === id)?.req_key ?? id;
    if (type === "block") return blocks.find((b) => b.id === id)?.name ?? id;
    if (type === "task") return tasks.find((t) => t.id === id)?.title ?? id;
    return id;
  };

  const createLink = async () => {
    if (!reqId || !targetId) return;
    await api.createTraceLink({ project_id: projectId, source_type: "requirement", source_id: reqId, target_type: targetType, target_id: targetId, relation });
    setShowForm(false);
    setReqId("");
    setTargetId("");
    refresh();
  };

  const targetOptions = targetType === "block" ? blocks.map((b) => ({ id: b.id, label: b.name })) : tasks.map((t) => ({ id: t.id, label: t.title }));

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <Link2 size={14} /> Traceability
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 9px", background: "var(--accent-dim)", color: "var(--accent-text)", borderRadius: "var(--radius-sm)", fontSize: 11 }}
        >
          <Plus size={12} /> Link requirement
        </button>
      </div>

      {showForm && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: 10, marginBottom: 10, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", background: "var(--bg-surface)" }}>
          <select value={reqId} onChange={(e) => setReqId(e.target.value)} style={{ fontSize: 12 }}>
            <option value="">Requirement…</option>
            {requirements.map((r) => (
              <option key={r.id} value={r.id}>{r.req_key}</option>
            ))}
          </select>
          <select value={relation} onChange={(e) => setRelation(e.target.value as any)} style={{ fontSize: 12 }}>
            {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={targetType} onChange={(e) => { setTargetType(e.target.value as any); setTargetId(""); }} style={{ fontSize: 12 }}>
            <option value="block">Block</option>
            <option value="task">Task</option>
          </select>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={{ fontSize: 12, minWidth: 140 }}>
            <option value="">{targetType === "block" ? "Select block…" : "Select task…"}</option>
            {targetOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <button onClick={createLink} disabled={!reqId || !targetId} style={{ padding: "5px 10px", background: "var(--accent)", color: "#08131a", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 600 }}>
            Link
          </button>
          <button onClick={() => setShowForm(false)} style={{ color: "var(--text-tertiary)" }}>
            <X size={14} />
          </button>
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--text-tertiary)", fontSize: 10, textTransform: "uppercase" as const }}>
            <th style={{ padding: "4px 8px" }}>Source</th>
            <th style={{ padding: "4px 8px" }}>Relation</th>
            <th style={{ padding: "4px 8px" }}>Target</th>
          </tr>
        </thead>
        <tbody>
          {links.map((l) => (
            <tr key={l.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <td className="mono" style={{ padding: "6px 8px", color: "var(--accent-text)" }}>{labelFor(l.source_type, l.source_id)}</td>
              <td style={{ padding: "6px 8px", color: "var(--text-secondary)" }}>{l.relation}</td>
              <td style={{ padding: "6px 8px" }}>{labelFor(l.target_type, l.target_id)}</td>
            </tr>
          ))}
          {links.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: "14px 8px", color: "var(--text-tertiary)", textAlign: "center" }}>
                No trace links yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
