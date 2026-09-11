import { useEffect, useState } from "react";
import { Filter, Bookmark, X } from "lucide-react";
import { api, SavedView, Requirement } from "@/lib/api";

export interface RequirementFilter {
  status: Requirement["status"] | "";
  reqType: Requirement["req_type"] | "";
}

export const EMPTY_REQ_FILTER: RequirementFilter = { status: "", reqType: "" };

export function RequirementFilterBar({
  projectId,
  filter,
  onChange,
}: {
  projectId: string;
  filter: RequirementFilter;
  onChange: (f: RequirementFilter) => void;
}) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [open, setOpen] = useState(false);

  const refreshViews = () => {
    api.listViews(projectId, "requirements").then(setViews).catch(console.error);
  };
  useEffect(refreshViews, [projectId]);

  const isActive = filter.status !== "" || filter.reqType !== "";

  const saveCurrentView = async () => {
    const name = window.prompt("Name this view", "My view");
    if (!name) return;
    await api.saveView(projectId, name, "requirements", JSON.stringify(filter));
    refreshViews();
  };

  const applyView = (v: SavedView) => {
    try {
      onChange(JSON.parse(v.filter_json));
    } catch {
      /* ignore malformed saved filter */
    }
    setOpen(false);
  };

  const removeView = async (id: string) => {
    await api.deleteView(id);
    refreshViews();
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", border: `1px solid ${isActive ? "var(--accent)" : "var(--border-subtle)"}`, borderRadius: "var(--radius-sm)", fontSize: 12, color: isActive ? "var(--accent-text)" : "var(--text-secondary)" }}
      >
        <Filter size={13} /> Filter{isActive ? " (active)" : ""}
      </button>

      {views.length > 0 && (
        <select onChange={(e) => { const v = views.find((x) => x.id === e.target.value); if (v) applyView(v); }} value="" style={{ fontSize: 12 }}>
          <option value="">Saved views…</option>
          {views.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      )}

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div style={{ position: "absolute", top: 34, left: 0, zIndex: 100, background: "var(--bg-surface-raised)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-md)", padding: 12, width: 240, boxShadow: "0 16px 40px rgba(0,0,0,0.4)" }}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 4 }}>Status</label>
              <select value={filter.status} onChange={(e) => onChange({ ...filter, status: e.target.value as any })} style={{ width: "100%", fontSize: 12 }}>
                <option value="">Any</option>
                <option value="Draft">Draft</option>
                <option value="Reviewed">Reviewed</option>
                <option value="Approved">Approved</option>
                <option value="Verified">Verified</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 4 }}>Type</label>
              <select value={filter.reqType} onChange={(e) => onChange({ ...filter, reqType: e.target.value as any })} style={{ width: "100%", fontSize: 12 }}>
                <option value="">Any</option>
                <option value="Functional">Functional</option>
                <option value="Performance">Performance</option>
                <option value="Interface">Interface</option>
                <option value="Constraint">Constraint</option>
                <option value="Stakeholder">Stakeholder</option>
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <button onClick={() => onChange(EMPTY_REQ_FILTER)} style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Clear</button>
              <button onClick={saveCurrentView} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--accent-text)" }}>
                <Bookmark size={12} /> Save as view
              </button>
            </div>
            {views.length > 0 && (
              <div style={{ marginTop: 10, borderTop: "1px solid var(--border-subtle)", paddingTop: 8 }}>
                {views.map((v) => (
                  <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "3px 0" }}>
                    <span>{v.name}</span>
                    <button onClick={() => removeView(v.id)} style={{ color: "var(--text-tertiary)" }}><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
