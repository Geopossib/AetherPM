import { useEffect, useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { api, Diagram, DiagramType, SysmlElement, ValidationIssue } from "@/lib/api";
import { ModelTree } from "./ModelTree";
import { DiagramCanvas } from "./DiagramCanvas";

const SEVERITY_COLOR: Record<ValidationIssue["severity"], string> = {
  info: "var(--text-tertiary)",
  warning: "var(--status-warning)",
  error: "var(--status-danger)",
};

export function ModelExplorerView() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const [elements, setElements] = useState<SysmlElement[]>([]);
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [activeDiagram, setActiveDiagram] = useState<Diagram | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [showValidation, setShowValidation] = useState(false);

  const refresh = () => {
    if (!currentProjectId) return;
    api.listSysmlElements(currentProjectId).then(setElements).catch(console.error);
    api.listDiagrams(currentProjectId).then((d) => {
      setDiagrams(d);
      setActiveDiagram((prev) => prev ?? d[0] ?? null);
    });
    api.validateProject(currentProjectId).then(setIssues).catch(console.error);
  };

  useEffect(() => {
    setActiveDiagram(null);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  const newDiagram = async (type: DiagramType) => {
    if (!currentProjectId) return;
    const name = window.prompt(`Name for the new ${type} diagram`, `${type} 1`);
    if (!name) return;
    const created = await api.createDiagram(currentProjectId, name, type);
    setDiagrams((d) => [...d, created]);
    setActiveDiagram(created);
  };

  if (!currentProjectId) {
    return <div style={{ padding: "var(--space-6)", color: "var(--text-secondary)" }}>Select a project first.</div>;
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <ModelTree
        elements={elements}
        diagrams={diagrams}
        activeDiagramId={activeDiagram?.id ?? null}
        onSelectDiagram={(id) => setActiveDiagram(diagrams.find((d) => d.id === id) ?? null)}
        onNewDiagram={newDiagram}
      />

      <div style={{ flex: 1, position: "relative", display: "flex" }}>
        {activeDiagram ? (
          <DiagramCanvas key={activeDiagram.id} diagram={activeDiagram} projectId={currentProjectId} elements={elements} onElementsChanged={refresh} />
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
            Create a diagram from the left panel to get started.
          </div>
        )}

        <button
          onClick={() => setShowValidation(!showValidation)}
          title="Validation issues"
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 20,
            background: errorCount > 0 ? "var(--status-danger)" : warningCount > 0 ? "var(--status-warning)" : "var(--bg-surface-raised)",
            color: errorCount > 0 || warningCount > 0 ? "#08131a" : "var(--text-tertiary)",
            border: "1px solid var(--border-strong)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <ShieldAlert size={14} /> {issues.length}
        </button>

        {showValidation && (
          <div
            style={{
              position: "absolute",
              bottom: 60,
              right: 16,
              width: 340,
              maxHeight: 360,
              overflowY: "auto",
              background: "var(--bg-surface-raised)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-md)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
              zIndex: 20,
            }}
            className="scrollbar-thin"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Validation</span>
              <button onClick={() => setShowValidation(false)} style={{ color: "var(--text-tertiary)" }}>
                <X size={14} />
              </button>
            </div>
            {issues.length === 0 ? (
              <div style={{ padding: 14, fontSize: 12, color: "var(--text-tertiary)" }}>No issues found.</div>
            ) : (
              issues.map((issue, i) => (
                <div key={i} style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)", fontSize: 12 }}>
                  <span style={{ color: SEVERITY_COLOR[issue.severity], fontSize: 10, textTransform: "uppercase" as const, fontWeight: 700 }}>
                    {issue.severity}
                  </span>
                  <div style={{ marginTop: 2 }}>{issue.message}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
