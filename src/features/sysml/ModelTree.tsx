import { Box, Users, GitBranch, ListTree, FileStack, Plus } from "lucide-react";
import { SysmlElement, Diagram, DiagramType } from "@/lib/api";

const TYPE_ICON: Record<DiagramType, typeof Box> = {
  Requirements: ListTree,
  BDD: Box,
  IBD: GitBranch,
  UseCase: Users,
  Activity: FileStack,
};

export function ModelTree({
  elements,
  diagrams,
  activeDiagramId,
  onSelectDiagram,
  onNewDiagram,
}: {
  elements: SysmlElement[];
  diagrams: Diagram[];
  activeDiagramId: string | null;
  onSelectDiagram: (id: string) => void;
  onNewDiagram: (type: DiagramType) => void;
}) {
  const diagramTypes: DiagramType[] = ["Requirements", "BDD", "IBD", "UseCase", "Activity"];
  const packages = Array.from(new Set(elements.map((e) => e.package || "Unassigned")));

  return (
    <div style={{ width: 240, borderRight: "1px solid var(--border-subtle)", overflowY: "auto" }} className="scrollbar-thin">
      <div style={{ padding: "12px 14px 6px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" as const }}>
        Diagrams
      </div>
      {diagramTypes.map((type) => {
        const Icon = TYPE_ICON[type];
        const typeDiagrams = diagrams.filter((d) => d.diagram_type === type);
        return (
          <div key={type} style={{ marginBottom: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 14px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                <Icon size={13} /> {typeLabel(type)}
              </span>
              <button onClick={() => onNewDiagram(type)} title={`New ${typeLabel(type)} diagram`} style={{ color: "var(--text-tertiary)" }}>
                <Plus size={12} />
              </button>
            </div>
            {typeDiagrams.map((d) => (
              <button
                key={d.id}
                onClick={() => onSelectDiagram(d.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "5px 14px 5px 33px",
                  fontSize: 12,
                  color: activeDiagramId === d.id ? "var(--text-primary)" : "var(--text-tertiary)",
                  background: activeDiagramId === d.id ? "var(--bg-surface-raised)" : "transparent",
                  borderLeft: activeDiagramId === d.id ? "2px solid var(--accent)" : "2px solid transparent",
                }}
              >
                {d.name}
              </button>
            ))}
          </div>
        );
      })}

      <div style={{ padding: "14px 14px 6px", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" as const, borderTop: "1px solid var(--border-subtle)", marginTop: 8 }}>
        Elements
      </div>
      {elements.length === 0 && <div style={{ padding: "0 14px 14px", fontSize: 12, color: "var(--text-tertiary)" }}>None yet.</div>}
      {packages.map((pkg) => (
        <div key={pkg} style={{ marginBottom: 6 }}>
          <div style={{ padding: "4px 14px", fontSize: 11, color: "var(--text-tertiary)" }}>{pkg}</div>
          {elements
            .filter((e) => (e.package || "Unassigned") === pkg)
            .map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 14px 3px 26px", fontSize: 12, color: "var(--text-secondary)" }}>
                <Box size={11} />
                {e.name}
                <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-tertiary)" }}>{e.element_type}</span>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

function typeLabel(type: DiagramType) {
  switch (type) {
    case "BDD":
      return "Block Definition";
    case "IBD":
      return "Internal Block";
    case "UseCase":
      return "Use Case";
    default:
      return type;
  }
}
