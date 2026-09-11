import { useState } from "react";
import { X } from "lucide-react";
import { api, ProjectType } from "@/lib/api";

const TYPES: { value: ProjectType; label: string; hint: string }[] = [
  { value: "General", label: "General", hint: "Any project — tasks, milestones, no engineering artifacts." },
  { value: "Software", label: "Software", hint: "Adds sprints/iterations alongside the standard board." },
  { value: "SystemsEngineering", label: "Systems Engineering", hint: "Adds requirements, traceability, and SysML diagrams." },
  { value: "Research", label: "Research", hint: "Tuned for research programs — milestones over sprints." },
  { value: "Custom", label: "Custom", hint: "Start blank and configure modules yourself later." },
];

export function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProjectType>("SystemsEngineering");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const project = await api.createProject(name.trim(), description.trim() || null, type);
      onCreated(project.id);
      onClose();
    } catch (err) {
      console.error(err);
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          background: "var(--bg-surface-raised)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>New project</span>
          <button onClick={onClose} style={{ color: "var(--text-tertiary)" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Project name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CH701 Avionics Suite"
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Project type</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {TYPES.map((t) => (
                <label
                  key={t.value}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${type === t.value ? "var(--accent)" : "var(--border-subtle)"}`,
                    background: type === t.value ? "var(--accent-dim)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <input type="radio" name="ptype" checked={type === t.value} onChange={() => setType(t.value)} style={{ marginTop: 3 }} />
                  <span>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{t.hint}</div>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: 16, borderTop: "1px solid var(--border-subtle)" }}>
          <button onClick={onClose} style={{ padding: "7px 12px", color: "var(--text-secondary)" }}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || busy}
            style={{
              padding: "7px 14px",
              background: name.trim() ? "var(--accent)" : "var(--border-subtle)",
              color: name.trim() ? "#08131a" : "var(--text-tertiary)",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600,
            }}
          >
            {busy ? "Creating…" : "Create project"}
          </button>
        </div>
      </div>
    </div>
  );
}
