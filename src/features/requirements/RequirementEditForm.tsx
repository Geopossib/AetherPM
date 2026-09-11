import { useState } from "react";
import { api, Requirement } from "@/lib/api";
import { useAutosave, AutosaveIndicator } from "@/lib/useAutosave";

const REQ_TYPES: Requirement["req_type"][] = ["Functional", "Performance", "Interface", "Constraint", "Stakeholder"];
const STATUSES: Requirement["status"][] = ["Draft", "Reviewed", "Approved", "Verified", "Rejected"];
const PRIORITIES: Requirement["priority"][] = ["Low", "Medium", "High", "Critical"];
const VERIFICATION_METHODS: Requirement["verification_method"][] = ["None", "Inspection", "Analysis", "Demonstration", "Test"];

export function RequirementEditForm({
  requirement,
  allRequirements,
  onSaved,
}: {
  requirement: Requirement;
  allRequirements: Requirement[];
  onSaved: () => void;
}) {
  const [statement, setStatement] = useState(requirement.statement);
  const [reqType, setReqType] = useState(requirement.req_type);
  const [status, setStatus] = useState(requirement.status);
  const [priority, setPriority] = useState(requirement.priority);
  const [verificationMethod, setVerificationMethod] = useState(requirement.verification_method);
  const [parentId, setParentId] = useState(requirement.parent_requirement_id ?? "");

  const status_ = useAutosave({ statement, reqType, status, priority, verificationMethod, parentId }, async (v) => {
    await api.saveRequirement({
      id: requirement.id,
      project_id: requirement.project_id,
      statement: v.statement,
      req_type: v.reqType,
      status: v.status,
      priority: v.priority,
      verification_method: v.verificationMethod,
      parent_requirement_id: v.parentId || null,
    });
    onSaved();
  });

  const candidateParents = allRequirements.filter((r) => r.id !== requirement.id);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
        <AutosaveIndicator status={status_} />
      </div>

      <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Statement</label>
      <textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={3} style={{ width: "100%", marginBottom: 14, lineHeight: 1.5 }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Type</label>
          <select value={reqType} onChange={(e) => setReqType(e.target.value as Requirement["req_type"])} style={{ width: "100%" }}>
            {REQ_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as Requirement["status"])} style={{ width: "100%" }}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Requirement["priority"])} style={{ width: "100%" }}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Verification</label>
          <select value={verificationMethod} onChange={(e) => setVerificationMethod(e.target.value as Requirement["verification_method"])} style={{ width: "100%" }}>
            {VERIFICATION_METHODS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Parent requirement</label>
      <select value={parentId} onChange={(e) => setParentId(e.target.value)} style={{ width: "100%", marginBottom: 4 }}>
        <option value="">None</option>
        {candidateParents.map((r) => <option key={r.id} value={r.id}>{r.req_key} — {r.statement.slice(0, 40)}</option>)}
      </select>
    </div>
  );
}
