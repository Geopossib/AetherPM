import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { format } from "date-fns";
import { api, AppNotification } from "@/lib/api";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = () => api.listNotifications().then(setNotifications).catch(console.error);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000); // simple poll; fine for a local single-user app
    return () => clearInterval(interval);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const openPanel = async () => {
    setOpen(!open);
  };

  const markAll = async () => {
    await api.markAllNotificationsRead();
    refresh();
  };

  return (
    <div style={{ position: "relative" }}>
      <button onClick={openPanel} style={{ position: "relative", color: "var(--text-secondary)", padding: 4 }} title="Notifications">
        <Bell size={16} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--status-danger)",
            }}
          />
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div
            className="scrollbar-thin"
            style={{
              position: "absolute",
              top: 28,
              right: 0,
              width: 320,
              maxHeight: 380,
              overflowY: "auto",
              background: "var(--bg-surface-raised)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-md)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
              zIndex: 100,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Notifications</span>
              {unread > 0 && (
                <button onClick={markAll} style={{ fontSize: 11, color: "var(--accent-text)" }}>
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12, color: "var(--text-tertiary)" }}>Nothing yet.</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={async () => {
                    await api.markNotificationRead(n.id);
                    refresh();
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--border-subtle)",
                    background: n.read ? "transparent" : "var(--accent-dim)",
                  }}
                >
                  <div style={{ fontSize: 12 }}>{n.body}</div>
                  <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 3 }}>{format(new Date(n.created_at), "PPp")}</div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
