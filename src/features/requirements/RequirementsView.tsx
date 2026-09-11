import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { api, Requirement } from "@/lib/api";
import { TraceabilityMatrix } from "./TraceabilityMatrix";
import { RequirementFilterBar, RequirementFilter, EMPTY_REQ_FILTER } from "./RequirementFilterBar";
import { RequirementEditForm } from "./RequirementEditForm";
import { InspectorDrawer } from "@/components/InspectorDrawer";
import { CommentThread } from "@/components/CommentThread";
import { AttachmentsList } from "@/components/AttachmentsList";

export function RequirementsView() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [orphans, setOrphans] = useState<Requirement[]>([]);
  const [openReqId, setOpenReqId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<RequirementFilter>(EMPTY_REQ_FILTER);

  const refresh = () => {
    if (!currentProjectId) return;
    api.listRequirements(currentProjectId).then(setRequirements).catch(console.error);
    api.findOrphanRequirements(currentProjectId).then(setOrphans).catch(console.error);
  };

  useEffect(refresh, [currentProjectId]);

  useEffect(() => {
    const openId = searchParams.get("openReq");
    if (openId && requirements.some((r) => r.id === openId)) {
      setOpenReqId(openId);
      searchParams.delete("openReq");
      setSearchParams(searchParams, { replace: true });
    }
  }, [requirements, searchParams, setSearchParams]);

  const addRequirement = async () => {
    if (!currentProjectId) return;
    const statement = window.prompt("Requirement statement (e.g. 'The system shall...')");
    if (!statement) return;
    await api.saveRequirement({
      project_id: currentProjectId,
      statement,
      req_type: "Functional",
      status: "Draft",
      priority: "Medium",
      verification_method: "None",
    });
    refresh();
  };

  if (!currentProjectId) {
    return <div style={{ padding: "var(--space-6)", color: "var(--text-secondary)" }}>Select a project first.</div>;
  }

  const orphanIds = new Set(orphans.map((o) => o.id));
  const openReq = requirements.find((r) => r.id === openReqId) ?? null;
  const visibleRequirements = requirements.filter(
    (r) => (!filter.status || r.status === filter.status) && (!filter.reqType || r.req_type === filter.reqType)
  );

  return (
    <div style={{ position: "relative", height: "100%", overflowY: "auto" }} className="scrollbar-thin">
      <div style={{ padding: "var(--space-5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Requirements</h1>
          <button
            onClick={addRequirement}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              background: "var(--accent-dim)",
              color: "var(--accent-text)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
            }}
          >
            <Plus size={14} /> New requirement
          </button>
        </div>

        <RequirementFilterBar projectId={currentProjectId} filter={filter} onChange={setFilter} />

        {orphans.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              marginBottom: "var(--space-4)",
              background: "rgba(232,162,61,0.08)",
              border: "1px solid var(--status-warning)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              color: "var(--status-warning)",
            }}
          >
            <AlertTriangle size={14} />
            {orphans.length} requirement{orphans.length > 1 ? "s have" : " has"} no trace links (validation rule: orphan requirement).
          </div>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-tertiary)", fontSize: 11, textTransform: "uppercase" as const }}>
              <th style={{ padding: "6px 8px" }}>ID</th>
              <th style={{ padding: "6px 8px" }}>Statement</th>
              <th style={{ padding: "6px 8px" }}>Type</th>
              <th style={{ padding: "6px 8px" }}>Status</th>
              <th style={{ padding: "6px 8px" }}>Verification</th>
              <th style={{ padding: "6px 8px" }}>Trace</th>
            </tr>
          </thead>
          <tbody>
            {visibleRequirements.map((r) => (
              <tr
                key={r.id}
                onClick={() => setOpenReqId(r.id)}
                style={{ borderTop: "1px solid var(--border-subtle)", cursor: "pointer" }}
              >
                <td className="mono" style={{ padding: "8px", color: "var(--accent-text)" }}>
                  {r.req_key}
                </td>
                <td style={{ padding: "8px" }}>{r.statement}</td>
                <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{r.req_type}</td>
                <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{r.status}</td>
                <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{r.verification_method}</td>
                <td style={{ padding: "8px" }}>
                  {orphanIds.has(r.id) ? (
                    <span style={{ color: "var(--status-warning)" }}>None</span>
                  ) : (
                    <span style={{ color: "var(--status-success)" }}>Linked</span>
                  )}
                </td>
              </tr>
            ))}
            {visibleRequirements.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "24px 8px", color: "var(--text-tertiary)", textAlign: "center" }}>
                  {requirements.length === 0
                    ? "No requirements yet. Add the first one to start building your traceability matrix."
                    : "No requirements match the current filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <TraceabilityMatrix projectId={currentProjectId} requirements={requirements} />
      </div>

      {openReq && (
        <InspectorDrawer title={openReq.req_key} subtitle={`${openReq.req_type} · ${openReq.status}`} onClose={() => setOpenReqId(null)}>
          <div style={{ marginBottom: 20 }}>
            <RequirementEditForm requirement={openReq} allRequirements={requirements} onSaved={refresh} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <AttachmentsList projectId={openReq.project_id} entityType="requirement" entityId={openReq.id} />
          </div>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Comments</h3>
          <CommentThread projectId={openReq.project_id} entityType="requirement" entityId={openReq.id} />
        </InspectorDrawer>
      )}
    </div>
  );
}
