import { X } from "lucide-react";
import { ReactNode } from "react";

export function InspectorDrawer({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="scrollbar-thin"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: "var(--inspector-width)",
        background: "var(--bg-surface)",
        borderLeft: "1px solid var(--border-subtle)",
        overflowY: "auto",
        boxShadow: "-8px 0 24px rgba(0,0,0,0.25)",
        zIndex: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          padding: "14px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          position: "sticky",
          top: 0,
          background: "var(--bg-surface)",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{subtitle}</div>}
        </div>
        <button onClick={onClose} style={{ color: "var(--text-tertiary)" }} aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}
