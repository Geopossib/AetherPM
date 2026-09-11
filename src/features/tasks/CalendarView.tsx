import { useEffect, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { api, Task } from "@/lib/api";

export function CalendarView() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => {
    if (currentProjectId) api.listTasks(currentProjectId).then(setTasks).catch(console.error);
  }, [currentProjectId]);

  if (!currentProjectId) {
    return <div style={{ padding: "var(--space-6)", color: "var(--text-secondary)" }}>Select a project first.</div>;
  }

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const tasksOn = (day: Date) => tasks.filter((t) => t.due_date && isSameDay(new Date(t.due_date), day));

  return (
    <div style={{ padding: "var(--space-5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{format(cursor, "MMMM yyyy")}</h2>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setCursor(subMonths(cursor, 1))} style={{ color: "var(--text-secondary)", padding: 4 }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setCursor(new Date())} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "0 8px" }}>
            Today
          </button>
          <button onClick={() => setCursor(addMonths(cursor, 1))} style={{ color: "var(--text-secondary)", padding: 4 }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: "var(--border-subtle)", border: "1px solid var(--border-subtle)" }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} style={{ background: "var(--bg-inset)", padding: "6px 8px", fontSize: 11, color: "var(--text-tertiary)" }}>
            {d}
          </div>
        ))}
        {days.map((day) => {
          const dayTasks = tasksOn(day);
          const inMonth = isSameMonth(day, cursor);
          return (
            <div
              key={day.toISOString()}
              style={{
                minHeight: 84,
                background: "var(--bg-surface)",
                padding: 6,
                opacity: inMonth ? 1 : 0.35,
              }}
            >
              <div style={{ fontSize: 11, color: isSameDay(day, new Date()) ? "var(--accent-text)" : "var(--text-tertiary)", fontWeight: isSameDay(day, new Date()) ? 700 : 400 }}>
                {format(day, "d")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                {dayTasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    title={t.title}
                    style={{
                      fontSize: 10,
                      padding: "1px 4px",
                      borderRadius: 3,
                      background: t.status === "Done" ? "var(--bg-inset)" : "var(--accent-dim)",
                      color: t.status === "Done" ? "var(--text-tertiary)" : "var(--accent-text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > 3 && <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>+{dayTasks.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
