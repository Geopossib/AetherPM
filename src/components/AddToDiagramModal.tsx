import { useState } from "react";
import { X, Plus } from "lucide-react";

export interface PickableItem {
  id: string;
  label: string;
  sublabel?: string;
}

export function AddToDiagramModal({
  title,
  items,
  allowCreate,
  onClose,
  onPickExisting,
  onCreateNew,
}: {
  title: string;
  items: PickableItem[];
  allowCreate: boolean;
  onClose: () => void;
  onPickExisting: (id: string) => void;
  onCreateNew: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 420, maxHeight: "70vh", display: "flex", flexDirection: "column", background: "var(--bg-surface-raised)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-md)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
          <button onClick={onClose} style={{ color: "var(--text-tertiary)" }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: 10 }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={allowCreate ? "Search, or type a new name…" : "Search…"}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ overflowY: "auto", flex: 1 }} className="scrollbar-thin">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => onPickExisting(item.id)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", fontSize: 13 }}
            >
              {item.label}
              {item.sublabel && <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{item.sublabel}</div>}
            </button>
          ))}
          {filtered.length === 0 && <div style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-tertiary)" }}>No matches.</div>}
        </div>

        {allowCreate && query.trim() && (
          <button
            onClick={() => onCreateNew(query.trim())}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderTop: "1px solid var(--border-subtle)",
              fontSize: 13,
              color: "var(--accent-text)",
            }}
          >
            <Plus size={14} /> Create "{query.trim()}"
          </button>
        )}
      </div>
    </div>
  );
}
