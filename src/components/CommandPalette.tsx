import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { CheckSquare, ListChecks } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { api, SearchResult } from "@/lib/api";

const DESTINATIONS = [
  { label: "Dashboard", path: "/" },
  { label: "Board", path: "/board" },
  { label: "Planning (Timeline/Calendar/Sprints)", path: "/timeline" },
  { label: "Requirements", path: "/requirements" },
  { label: "Model Explorer", path: "/model" },
  { label: "Risks", path: "/risks" },
  { label: "Decisions", path: "/decisions" },
  { label: "Meeting Notes", path: "/notes" },
  { label: "Settings", path: "/settings" },
];

export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  // Debounced live search across the current project's tasks/requirements.
  useEffect(() => {
    if (!currentProjectId || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      api.searchAll(currentProjectId, query.trim()).then(setResults).catch(console.error);
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, currentProjectId]);

  if (!open) return null;

  const goToResult = (r: SearchResult) => {
    if (r.entity_type === "task") navigate(`/board?openTask=${r.entity_id}`);
    if (r.entity_type === "requirement") navigate(`/requirements?openReq=${r.entity_id}`);
    setOpen(false);
    setQuery("");
  };

  return (
    <div
      onClick={() => setOpen(false)}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", paddingTop: "12vh", zIndex: 100 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
        <Command
          shouldFilter={false}
          style={{ background: "var(--bg-surface-raised)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-md)", overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,0.4)" }}
        >
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Jump to a view, or search tasks & requirements…"
            style={{ width: "100%", padding: "12px 14px", background: "transparent", border: "none", borderBottom: "1px solid var(--border-subtle)", fontSize: 14 }}
          />
          <Command.List style={{ padding: 6, maxHeight: 380, overflowY: "auto" }}>
            {results.length > 0 && (
              <Command.Group heading="Search results" style={{ fontSize: 11, color: "var(--text-tertiary)", padding: "6px 10px 2px", textTransform: "uppercase" as const }}>
                {results.map((r) => (
                  <Command.Item
                    key={`${r.entity_type}-${r.entity_id}`}
                    onSelect={() => goToResult(r)}
                    style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 8 }}
                  >
                    {r.entity_type === "task" ? <CheckSquare size={14} style={{ marginTop: 2, flexShrink: 0, color: "var(--text-tertiary)" }} /> : <ListChecks size={14} style={{ marginTop: 2, flexShrink: 0, color: "var(--text-tertiary)" }} />}
                    <span>
                      <div>{r.title}</div>
                      {r.snippet && <div style={{ fontSize: 11, color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 380 }}>{r.snippet}</div>}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Go to" style={{ fontSize: 11, color: "var(--text-tertiary)", padding: "6px 10px 2px", textTransform: "uppercase" as const }}>
              {DESTINATIONS.filter((d) => d.label.toLowerCase().includes(query.toLowerCase())).map((d) => (
                <Command.Item
                  key={d.path}
                  onSelect={() => {
                    navigate(d.path);
                    setOpen(false);
                    setQuery("");
                  }}
                  style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", fontSize: 13, cursor: "pointer" }}
                >
                  {d.label}
                </Command.Item>
              ))}
            </Command.Group>

            {results.length === 0 && DESTINATIONS.filter((d) => d.label.toLowerCase().includes(query.toLowerCase())).length === 0 && (
              <Command.Empty style={{ padding: "10px 12px", color: "var(--text-tertiary)", fontSize: 13 }}>No matches.</Command.Empty>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
