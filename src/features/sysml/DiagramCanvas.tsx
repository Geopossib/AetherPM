import { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
} from "reactflow";
import "reactflow/dist/style.css";
import { Save, Plus } from "lucide-react";
import { api, Diagram, DiagramType, SysmlElement, SysmlElementType, Requirement } from "@/lib/api";
import { AddToDiagramModal, PickableItem } from "@/components/AddToDiagramModal";

function nodeStyle(isRequirement: boolean) {
  return {
    background: "var(--bg-surface)",
    border: `1px solid ${isRequirement ? "var(--status-info)" : "var(--border-strong)"}`,
    borderRadius: 4,
    color: "var(--text-primary)",
    fontSize: 12,
    padding: 6,
    maxWidth: 220,
  };
}

// What each diagram type's "Add" buttons create. `elementType: null` means
// the node references a requirement directly rather than a sysml_element.
const PALETTE: Record<DiagramType, { label: string; elementType: SysmlElementType | null }[]> = {
  BDD: [{ label: "Block", elementType: "block" }],
  IBD: [{ label: "Part", elementType: "block" }, { label: "Port", elementType: "port" }],
  UseCase: [{ label: "Actor", elementType: "actor" }, { label: "Use case", elementType: "use_case" }],
  Activity: [{ label: "Action", elementType: "activity" }],
  Requirements: [{ label: "Requirement", elementType: null }],
};

let localIdCounter = 0;
function nextLocalId() {
  localIdCounter += 1;
  return `local-${localIdCounter}`;
}

export function DiagramCanvas({
  diagram,
  projectId,
  elements,
  onElementsChanged,
}: {
  diagram: Diagram;
  projectId: string;
  elements: SysmlElement[];
  onElementsChanged: () => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<{ label: string; elementId: string | null; requirementId: string | null }>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<{ label?: string }>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [pickerFor, setPickerFor] = useState<{ label: string; elementType: SysmlElementType | null } | null>(null);

  useEffect(() => {
    api.getDiagramDetail(diagram.id).then((detail) => {
      setNodes(
        detail.nodes.map((n) => ({
          id: n.id,
          position: { x: n.pos_x, y: n.pos_y },
          data: { label: n.label, elementId: n.element_id, requirementId: null },
          style: nodeStyle(false),
        }))
      );
      setEdges(
        detail.edges.map((e) => ({ id: e.id, source: e.source_node_id, target: e.target_node_id, label: e.label ?? undefined }))
      );
      setDirty(false);
    });
    if (diagram.diagram_type === "Requirements") {
      api.listRequirements(projectId).then(setRequirements);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram.id]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      setDirty(true);
    },
    [setEdges]
  );

  const placeNode = (label: string, elementId: string | null, requirementId: string | null) => {
    const id = nextLocalId();
    setNodes((n) => [
      ...n,
      {
        id,
        position: { x: 120 + (n.length % 5) * 40, y: 80 + n.length * 30 },
        data: { label, elementId, requirementId },
        style: nodeStyle(requirementId !== null),
      },
    ]);
    setDirty(true);
  };

  const openPicker = (palette: { label: string; elementType: SysmlElementType | null }) => setPickerFor(palette);

  const pickerItems: PickableItem[] =
    pickerFor?.elementType === null
      ? requirements.map((r) => ({ id: r.id, label: r.req_key, sublabel: r.statement }))
      : elements.filter((e) => e.element_type === pickerFor?.elementType).map((e) => ({ id: e.id, label: e.name, sublabel: e.package ?? undefined }));

  const handlePickExisting = (id: string) => {
    if (!pickerFor) return;
    if (pickerFor.elementType === null) {
      const req = requirements.find((r) => r.id === id)!;
      placeNode(`${req.req_key}: ${req.statement}`, null, req.id);
    } else {
      const el = elements.find((e) => e.id === id)!;
      placeNode(el.name, el.id, null);
    }
    setPickerFor(null);
  };

  const handleCreateNew = async (name: string) => {
    if (!pickerFor) return;
    if (pickerFor.elementType === null) {
      // Can't "create" a requirement from here — send them to the real view.
      window.alert('Create the requirement first on the Requirements page, then add it here.');
      setPickerFor(null);
      return;
    }
    const created = await api.saveSysmlElement({ project_id: projectId, element_type: pickerFor.elementType, name, package: diagram.name });
    onElementsChanged();
    placeNode(created.name, created.id, null);
    setPickerFor(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      const nodeInputs = nodes.map((n) => ({
        client_id: n.id,
        element_id: (n.data as any).elementId ?? null,
        label: (n.data as any).label,
        pos_x: n.position.x,
        pos_y: n.position.y,
      }));
      const edgeInputs = edges.map((e) => ({
        source_client_id: e.source,
        target_client_id: e.target,
        label: (e.label as string) ?? null,
      }));
      const detail = await api.saveDiagramLayout(diagram.id, nodeInputs, edgeInputs);
      setNodes(
        detail.nodes.map((n) => ({
          id: n.id,
          position: { x: n.pos_x, y: n.pos_y },
          data: { label: n.label, elementId: n.element_id, requirementId: null },
          style: nodeStyle(false),
        }))
      );
      setEdges(detail.edges.map((e) => ({ id: e.id, source: e.source_node_id, target: e.target_node_id, label: e.label ?? undefined })));
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ flex: 1, position: "relative" }}>
      <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10, display: "flex", gap: 8 }}>
        {PALETTE[diagram.diagram_type].map((p) => (
          <button
            key={p.label}
            onClick={() => openPicker(p)}
            style={{ padding: "6px 10px", background: "var(--bg-surface-raised)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={13} /> {p.label}
          </button>
        ))}
      </div>

      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}>
        <button
          onClick={save}
          disabled={!dirty || saving}
          style={{
            padding: "6px 12px",
            background: dirty ? "var(--accent)" : "var(--bg-surface-raised)",
            color: dirty ? "#08131a" : "var(--text-tertiary)",
            border: dirty ? "none" : "1px solid var(--border-strong)",
            borderRadius: "var(--radius-sm)",
            fontSize: 12,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Save size={13} /> {saving ? "Saving…" : dirty ? "Save diagram" : "Saved"}
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(c) => { onNodesChange(c); setDirty(true); }}
        onEdgesChange={(c) => { onEdgesChange(c); setDirty(true); }}
        onConnect={onConnect}
        fitView
        style={{ background: "var(--bg-canvas)" }}
      >
        <Background color="var(--border-subtle)" gap={18} />
        <Controls />
      </ReactFlow>

      {pickerFor && (
        <AddToDiagramModal
          title={`Add ${pickerFor.label.toLowerCase()}`}
          items={pickerItems}
          allowCreate={pickerFor.elementType !== null}
          onClose={() => setPickerFor(null)}
          onPickExisting={handlePickExisting}
          onCreateNew={handleCreateNew}
        />
      )}
    </div>
  );
}
