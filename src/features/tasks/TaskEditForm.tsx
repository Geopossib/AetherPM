import { useState } from "react";
import { api, Task } from "@/lib/api";
import { useAutosave, AutosaveIndicator } from "@/lib/useAutosave";

const STATUSES: Task["status"][] = ["Backlog", "Todo", "InProgress", "Review", "Done"];
const PRIORITIES: Task["priority"][] = ["Low", "Medium", "High", "Critical"];

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function TaskEditForm({ task, onSaved }: { task: Task; onSaved: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(toDateInput(task.due_date));
  const [startDate, setStartDate] = useState(toDateInput(task.start_date));
  const [assigneeName, setAssigneeName] = useState(task.assignee_name ?? "");
  const [tags, setTags] = useState(task.tags ?? "");
  const [estimateHours, setEstimateHours] = useState(task.estimate_hours?.toString() ?? "");
  const [actualHours, setActualHours] = useState(task.actual_hours?.toString() ?? "");

  const saveStatus = useAutosave(
    { title, description, status, priority, dueDate, startDate, assigneeName, tags, estimateHours, actualHours },
    async (v) => {
      await api.saveTask({
        id: task.id,
        project_id: task.project_id,
        title: v.title,
        description: v.description || null,
        status: v.status,
        priority: v.priority,
        due_date: v.dueDate ? new Date(v.dueDate).toISOString() : null,
        start_date: v.startDate ? new Date(v.startDate).toISOString() : null,
        assignee_name: v.assigneeName || null,
        tags: v.tags || null,
        estimate_hours: v.estimateHours ? parseFloat(v.estimateHours) : null,
        actual_hours: v.actualHours ? parseFloat(v.actualHours) : null,
      });
      onSaved();
    }
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
        <AutosaveIndicator status={saveStatus} />
      </div>

      <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", marginBottom: 14 }} />

      <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Description</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ width: "100%", marginBottom: 14, lineHeight: 1.5 }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as Task["status"])} style={{ width: "100%" }}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])} style={{ width: "100%" }}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: "100%" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Due date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: "100%" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Estimate (h)</label>
          <input type="number" min="0" step="0.5" value={estimateHours} onChange={(e) => setEstimateHours(e.target.value)} style={{ width: "100%" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Actual (h)</label>
          <input type="number" min="0" step="0.5" value={actualHours} onChange={(e) => setActualHours(e.target.value)} style={{ width: "100%" }} />
        </div>
      </div>

      <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Assignee</label>
      <input value={assigneeName} onChange={(e) => setAssigneeName(e.target.value)} placeholder="Unassigned" style={{ width: "100%", marginBottom: 14 }} />

      <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Tags (comma-separated)</label>
      <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. avionics, critical-path" style={{ width: "100%" }} />
    </div>
  );
}
