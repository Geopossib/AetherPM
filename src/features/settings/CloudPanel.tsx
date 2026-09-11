import { useEffect, useState } from "react";
import { format } from "date-fns";
import { save as saveDialog, open as openDialog } from "@tauri-apps/plugin-dialog";
import { Cloud, LogOut, Share2, Download } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { api } from "@/lib/api";
import { cloudApi, CloudSession, ShareSummary, StorageUsage, formatBytes } from "@/lib/cloudApi";

export function CloudPanel() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const projects = useAppStore((s) => s.projects);
  const [session, setSession] = useState<CloudSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [shares, setShares] = useState<ShareSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [shareCodeInput, setShareCodeInput] = useState("");

  const currentProject = projects.find((p) => p.id === currentProjectId);

  const refreshCloudState = async () => {
    try {
      const [u, s] = await Promise.all([cloudApi.storageUsage(), cloudApi.listShares()]);
      setUsage(u);
      setShares(s);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    cloudApi
      .currentSession()
      .then((s) => {
        setSession(s);
        if (s) refreshCloudState();
      })
      .finally(() => setLoading(false));
  }, []);

  const submitAuth = async () => {
    setAuthError(null);
    setBusy(true);
    try {
      const s = mode === "signin" ? await cloudApi.signIn(email, password) : await cloudApi.signUp(email, password);
      setSession(s);
      await refreshCloudState();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await cloudApi.signOut();
    setSession(null);
    setUsage(null);
    setShares([]);
  };

  const shareCurrentProject = async () => {
    if (!currentProjectId || !currentProject) return;
    const tempPath = await saveDialog({ defaultPath: `${currentProject.name.replace(/[^a-z0-9-_]+/gi, "_")}.json` });
    if (!tempPath) return;
    setBusy(true);
    try {
      await api.exportProject(currentProjectId, tempPath);
      const recipientRaw = window.prompt("Recipient's email (optional — leave blank for a code anyone can use)");
      const code = await cloudApi.shareProject(tempPath, currentProject.name, recipientRaw?.trim() || null);
      window.alert(`Share created. Code: ${code}\n\nSend this code to whoever you're sharing with.`);
      await refreshCloudState();
    } catch (err) {
      window.alert(`Couldn't share project: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const importByCode = async () => {
    if (!shareCodeInput.trim()) return;
    const dest = await openDialog({ directory: true });
    if (!dest || Array.isArray(dest)) return;
    setBusy(true);
    try {
      const destPath = `${dest}/${shareCodeInput.trim()}.json`;
      await cloudApi.downloadShare(shareCodeInput.trim(), destPath);
      await api.importProject(destPath);
      window.alert("Project imported.");
      setShareCodeInput("");
    } catch (err) {
      window.alert(`Couldn't import: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  if (!session) {
    return (
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <Cloud size={15} /> AetherPM Cloud
        </h2>
        <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 10 }}>
          Sign in to share projects with other people over the cloud instead of manually sending files. Everything
          else in AetherPM works fully offline without an account.
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button onClick={() => setMode("signin")} style={{ fontSize: 12, fontWeight: mode === "signin" ? 700 : 400, color: mode === "signin" ? "var(--text-primary)" : "var(--text-tertiary)" }}>
            Sign in
          </button>
          <button onClick={() => setMode("signup")} style={{ fontSize: 12, fontWeight: mode === "signup" ? 700 : 400, color: mode === "signup" ? "var(--text-primary)" : "var(--text-tertiary)" }}>
            Create account
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 280 }}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {authError && <div style={{ fontSize: 11, color: "var(--status-danger)" }}>{authError}</div>}
          <button
            onClick={submitAuth}
            disabled={busy || !email || !password}
            style={{ padding: "7px 12px", background: "var(--accent)", color: "#08131a", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600 }}
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </div>
      </section>
    );
  }

  const usagePct = usage ? Math.min(100, (usage.used_bytes / usage.limit_bytes) * 100) : 0;

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <Cloud size={15} /> AetherPM Cloud
        </h2>
        <button onClick={signOut} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-tertiary)" }}>
          <LogOut size={12} /> Sign out
        </button>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>{session.email}</div>

      {usage && (
        <div style={{ marginBottom: 14, maxWidth: 320 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>
            <span>Cloud storage</span>
            <span>{formatBytes(usage.used_bytes)} / {formatBytes(usage.limit_bytes)}</span>
          </div>
          <div style={{ height: 6, background: "var(--bg-inset)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${usagePct}%`, height: "100%", background: usagePct > 90 ? "var(--status-danger)" : "var(--accent)" }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={shareCurrentProject}
          disabled={!currentProjectId || busy}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", fontSize: 12 }}
        >
          <Share2 size={13} /> Share current project to cloud
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, maxWidth: 320 }}>
        <input value={shareCodeInput} onChange={(e) => setShareCodeInput(e.target.value.toUpperCase())} placeholder="Enter a share code…" style={{ flex: 1, fontSize: 12 }} />
        <button onClick={importByCode} disabled={!shareCodeInput.trim() || busy} style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 10px", background: "var(--accent-dim)", color: "var(--accent-text)", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
          <Download size={13} /> Import
        </button>
      </div>

      <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Your shares</h3>
      <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", maxWidth: 420 }}>
        {shares.length === 0 && <div style={{ padding: 10, fontSize: 12, color: "var(--text-tertiary)" }}>No active shares.</div>}
        {shares.map((s) => (
          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderBottom: "1px solid var(--border-subtle)", fontSize: 12 }}>
            <span>{s.project_name}</span>
            <span className="mono" style={{ color: "var(--accent-text)" }}>{s.share_code}</span>
            <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>expires {format(new Date(s.expires_at), "MMM d")}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
