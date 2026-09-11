import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  KanbanSquare,
  GanttChartSquare,
  ListChecks,
  ShieldAlert,
  FileText,
  ScrollText,
  Network,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/board", label: "Board", icon: KanbanSquare },
  { to: "/timeline", label: "Planning", icon: GanttChartSquare },
  { to: "/requirements", label: "Requirements", icon: ListChecks },
  { to: "/model", label: "Model Explorer", icon: Network },
  { to: "/risks", label: "Risks", icon: ShieldAlert },
  { to: "/decisions", label: "Decisions", icon: ScrollText },
  { to: "/notes", label: "Meeting Notes", icon: FileText },
];

export function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  return (
    <aside
      className="sidebar scrollbar-thin"
      style={{
        borderRight: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          height: "var(--topbar-height)",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: "0 var(--space-3)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {!collapsed && (
          <span style={{ fontWeight: 600, letterSpacing: "0.2px" }}>
            Aether<span style={{ color: "var(--accent)" }}>PM</span>
          </span>
        )}
        <button onClick={toggleSidebar} aria-label="Toggle sidebar" style={{ color: "var(--text-secondary)" }}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav style={{ padding: "var(--space-2)", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "8px 10px",
              borderRadius: "var(--radius-sm)",
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              background: isActive ? "var(--bg-surface-raised)" : "transparent",
              borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              textDecoration: "none",
              fontSize: 13,
              whiteSpace: "nowrap",
              overflow: "hidden",
            })}
            title={collapsed ? label : undefined}
          >
            <Icon size={17} style={{ flexShrink: 0 }} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div style={{ marginTop: "auto", padding: "var(--space-2)" }}>
        <NavLink
          to="/settings"
          style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "8px 10px",
            borderRadius: "var(--radius-sm)",
            color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
            textDecoration: "none",
            fontSize: 13,
          })}
        >
          <Settings size={17} />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>
    </aside>
  );
}
