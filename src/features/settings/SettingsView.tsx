import { useEffect, useState } from "react";
import { Sun, Moon, Plus, Trash2, Download, Upload } from "lucide-react";
import { save, open } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "@/stores/appStore";
import { api, ProjectMember, Role } from "@/lib/api";
import { CloudPanel } from "./CloudPanel";

const ROLES: Role[] = ["Owner", "Admin", "Editor", "Viewer"];

const SHORTCUTS: [string, string][] = [
  ["Command palette", "Ctrl / Cmd + K"],
  ["Toggle sidebar", "Click the sidebar icon"],
  ["Close a panel / modal", "Esc"],
];

export function SettingsView() {
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const projects = useAppStore((s) => s.projects);
  const setProjects = useAppStore((s) => s.setProjects);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  const exportProject = async () => {
    if (!currentProjectId || !currentProject) return;
    const dest = await save({
      defaultPath: `${currentProject.name.replace(/[^a-z0-9-_]+/gi, "_")}.json`,
      filters: [{ name: "AetherPM project", extensions: ["json"] }],
    });
    if (!dest) return;
    setExporting(true);
    try {
      await api.exportProject(currentProjectId, dest);
    } finally {
      setExporting(false);
    }
  };

  const importProject = async () => {
    const src = await open({ multiple: false, filters: [{ name: "AetherPM project", extensions: ["json"] }] });
    if (!src || Array.isArray(src)) return;
    setImporting(true);
    try {
      const imported = await api.importProject(src);
      const updated = await api.listProjects();
      setProjects(updated);
      setCurrentProject(imported.id);
    } finally {
      setImporting(false);
    }
  };

  const refresh = () => {
    if (currentProjectId) api.listMembers(currentProjectId).then(setMembers).catch(console.error);
  };
  useEffect(refresh, [currentProjectId]);

  const addMember = async () => {
    if (!currentProjectId) return;
    const name = window.prompt("Member's name");
    if (!name) return;
    await api.addMember(currentProjectId, name, "Editor");
    refresh();
  };

  const changeRole = async (memberId: string, role: Role) => {
    await api.updateMemberRole(memberId, role);
    refresh();
  };

  const removeMember = async (memberId: string) => {
    await api.removeMember(memberId);
    refresh();
  };

  return (
    <div style={{ padding: "var(--space-6)", maxWidth: 560 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: "var(--space-5)" }}>Settings</h1>

      <CloudPanel />

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Appearance</h2>
        <button
          onClick={toggleTheme}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 12px",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            fontSize: 13,
          }}
        >
          {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
          {theme === "dark" ? "Dark" : "Light"} theme — click to switch
        </button>
      </section>

      <section style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Members & roles</h2>
          <button
            onClick={addMember}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 9px", background: "var(--accent-dim)", color: "var(--accent-text)", borderRadius: "var(--radius-sm)", fontSize: 11 }}
          >
            <Plus size={12} /> Add member
          </button>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 10 }}>
          This is local-only for now — adding a member lets you assign tasks, @mention, and set a role, but doesn't
          grant them access on another machine until cloud sync ships (see docs/COLLABORATION.md).
        </p>
        <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
          {!currentProjectId && <div style={{ padding: 12, fontSize: 12, color: "var(--text-tertiary)" }}>Select a project to manage its members.</div>}
          {currentProjectId && members.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: 13 }}>{m.display_name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select
                  value={m.role}
                  onChange={(e) => changeRole(m.id, e.target.value as Role)}
                  disabled={m.role === "Owner"}
                  style={{ fontSize: 12 }}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {m.role !== "Owner" && (
                  <button onClick={() => removeMember(m.id)} style={{ color: "var(--status-danger)" }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {members.length === 0 && currentProjectId && <div style={{ padding: 12, fontSize: 12, color: "var(--text-tertiary)" }}>No members yet.</div>}
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Keyboard shortcuts</h2>
        <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
          {SHORTCUTS.map(([label, keys]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", fontSize: 12 }}>
              <span style={{ color: "var(--text-secondary)" }}>{label}</span>
              <span className="mono" style={{ color: "var(--text-tertiary)" }}>{keys}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Backup & sharing</h2>
        <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 10 }}>
          Export the current project to a JSON file to back it up or hand it to a teammate; import a file someone
          sent you as a new local project.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={exportProject}
            disabled={!currentProjectId || exporting}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", fontSize: 13 }}
          >
            <Download size={14} /> {exporting ? "Exporting…" : "Export current project"}
          </button>
          <button
            onClick={importProject}
            disabled={importing}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", fontSize: 13 }}
          >
            <Upload size={14} /> {importing ? "Importing…" : "Import a project"}
          </button>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Data location</h2>
        <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          All project data lives in a local SQLite file — nothing leaves this machine.
        </p>
        <ul style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6, paddingLeft: 18 }}>
          <li>Linux: <code className="mono">~/.local/share/aetherpm/aetherpm.db</code></li>
          <li>macOS: <code className="mono">~/Library/Application Support/aetherpm/aetherpm.db</code></li>
          <li>Windows: <code className="mono">%APPDATA%\aetherpm\aetherpm.db</code></li>
        </ul>
      </section>
    </div>
  );
}
