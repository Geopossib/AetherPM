import { useEffect, useState, CSSProperties } from "react";
import { differenceInCalendarDays, addDays, format, startOfDay, min as dateMin, max as dateMax } from "date-fns";
import { Plus, Diamond } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { api, Task, Milestone } from "@/lib/api";

const STATUS_COLOR: Record<Task["status"], string> = {
  Backlog: "var(--text-tertiary)",
  Todo: "var(--status-info)",
  InProgress: "var(--accent)",
  Review: "var(--status-warning)",
  Done: "var(--status-success)",
};

export function TimelineView() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const refresh = () => {
    if (!currentProjectId) return;
    api.listTasks(currentProjectId).then(setTasks).catch(console.error);
    api.listMilestones(currentProjectId).then(setMilestones).catch(console.error);
  };
  useEffect(refresh, [currentProjectId]);

  const addMilestone = async () => {
    if (!currentProjectId) return;
    const name = window.prompt("Milestone name");
    if (!name) return;
    const dueDate = window.prompt("Due date (YYYY-MM-DD)", format(new Date(), "yyyy-MM-dd"));
    await api.saveMilestone({ project_id: currentProjectId, name, due_date: dueDate ? new Date(dueDate).toISOString() : null });
    refresh();
  };

  if (!currentProjectId) {
    return <div style={{ padding: "var(--space-6)", color: "var(--text-secondary)" }}>Select a project first.</div>;
  }

  const scheduled = tasks.filter((t) => t.due_date);
  if (scheduled.length === 0 && milestones.length === 0) {
    return (
      <div style={{ padding: "var(--space-6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Timeline</h1>
          <button onClick={addMilestone} style={pillButtonStyle}>
            <Plus size={14} /> Milestone
          </button>
        </div>
        <p style={{ color: "var(--text-tertiary)" }}>
          No dated tasks or milestones yet. Add a due date to a task on the Board, or add a milestone here.
        </p>
      </div>
    );
  }

  // Compute the visible date range from whatever has dates, padded by
  // a few days on each side so bars aren't flush against the edges.
  const allDates = [
    ...scheduled.map((t) => new Date(t.start_date || t.due_date!)),
    ...scheduled.map((t) => new Date(t.due_date!)),
    ...milestones.filter((m) => m.due_date).map((m) => new Date(m.due_date!)),
  ];
  const rangeStart = addDays(startOfDay(dateMin(allDates)), -2);
  const rangeEnd = addDays(startOfDay(dateMax(allDates)), 3);
  const totalDays = Math.max(differenceInCalendarDays(rangeEnd, rangeStart), 7);
  const dayWidth = Math.max(1200 / totalDays, 22);

  const xFor = (d: Date) => differenceInCalendarDays(startOfDay(d), rangeStart) * dayWidth;

  return (
    <div style={{ padding: "var(--space-5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Timeline</h1>
        <button onClick={addMilestone} style={pillButtonStyle}>
          <Plus size={14} /> Milestone
        </button>
      </div>

      <div style={{ overflowX: "auto" }} className="scrollbar-thin">
        <div style={{ minWidth: totalDays * dayWidth + 220, position: "relative" }}>
          {/* Day scale header */}
          <div style={{ display: "flex", marginLeft: 220, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 6, marginBottom: 10 }}>
            {Array.from({ length: totalDays }).map((_, i) => {
              const d = addDays(rangeStart, i);
              const isMonthStart = d.getDate() === 1 || i === 0;
              return (
                <div key={i} style={{ width: dayWidth, flexShrink: 0, fontSize: 10, color: "var(--text-tertiary)" }}>
                  {isMonthStart ? format(d, "MMM d") : d.getDate() % 5 === 0 ? format(d, "d") : ""}
                </div>
              );
            })}
          </div>

          {/* Milestones row */}
          {milestones.length > 0 && (
            <div style={{ display: "flex", marginBottom: 10, position: "relative", height: 24 }}>
              <div style={{ width: 220, flexShrink: 0, fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>Milestones</div>
              <div style={{ position: "relative", flex: 1, height: 24 }}>
                {milestones
                  .filter((m) => m.due_date)
                  .map((m) => (
                    <div
                      key={m.id}
                      title={`${m.name} — ${format(new Date(m.due_date!), "PP")}`}
                      style={{ position: "absolute", left: xFor(new Date(m.due_date!)), display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <Diamond size={12} fill="var(--status-warning)" color="var(--status-warning)" />
                      <span style={{ fontSize: 11, whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{m.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Task bars */}
          {scheduled.map((t) => {
            const start = new Date(t.start_date || t.due_date!);
            const end = new Date(t.due_date!);
            const left = xFor(start);
            const width = Math.max(xFor(end) - left, dayWidth * 0.6);
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", height: 30 }}>
                <div style={{ width: 220, flexShrink: 0, fontSize: 12, paddingRight: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.title}
                </div>
                <div style={{ position: "relative", flex: 1, height: 20 }}>
                  <div
                    title={`${t.title}: ${format(start, "PP")} → ${format(end, "PP")}`}
                    style={{
                      position: "absolute",
                      left,
                      width,
                      height: 16,
                      top: 2,
                      borderRadius: 3,
                      background: STATUS_COLOR[t.status],
                      opacity: t.status === "Done" ? 0.55 : 0.9,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const pillButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  background: "var(--accent-dim)",
  color: "var(--accent-text)",
  borderRadius: "var(--radius-sm)",
  fontSize: 12,
};
