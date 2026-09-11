import { useState } from "react";
import { TimelineView } from "./TimelineView";
import { WBSView } from "./WBSView";
import { WorkloadView } from "./WorkloadView";
import { BaselinesView } from "./BaselinesView";
import { SprintsView } from "./SprintsView";
import { CalendarView } from "./CalendarView";

const TABS = [
  { key: "timeline", label: "Timeline", render: () => <TimelineView /> },
  { key: "calendar", label: "Calendar", render: () => <CalendarView /> },
  { key: "sprints", label: "Sprints", render: () => <SprintsView /> },
  { key: "wbs", label: "WBS", render: () => <WBSView /> },
  { key: "workload", label: "Workload", render: () => <WorkloadView /> },
  { key: "baselines", label: "Baselines", render: () => <BaselinesView /> },
] as const;

export function PlanningView() {
  const [active, setActive] = useState<(typeof TABS)[number]["key"]>("timeline");
  const activeTab = TABS.find((t) => t.key === active)!;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 4, padding: "10px var(--space-5) 0", borderBottom: "1px solid var(--border-subtle)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            style={{
              padding: "8px 12px",
              fontSize: 13,
              color: active === t.key ? "var(--text-primary)" : "var(--text-secondary)",
              borderBottom: active === t.key ? "2px solid var(--accent)" : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto" }} className="scrollbar-thin">
        {activeTab.render()}
      </div>
    </div>
  );
}
