import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { api, MeetingNote } from "@/lib/api";
import { useAutosave, AutosaveIndicator } from "@/lib/useAutosave";

export function MeetingNotesView() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = () => {
    if (currentProjectId) api.listMeetingNotes(currentProjectId).then(setNotes).catch(console.error);
  };
  useEffect(refresh, [currentProjectId]);

  const addNote = async () => {
    if (!currentProjectId) return;
    const title = window.prompt("Meeting title", "Weekly sync");
    if (!title) return;
    const created = await api.saveMeetingNote({
      project_id: currentProjectId,
      title,
      meeting_date: new Date().toISOString(),
      notes: "",
    });
    refresh();
    setSelectedId(created.id);
  };

  if (!currentProjectId) {
    return <div style={{ padding: "var(--space-6)", color: "var(--text-secondary)" }}>Select a project first.</div>;
  }

  const selected = notes.find((n) => n.id === selectedId) ?? notes[0] ?? null;

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ width: 260, borderRight: "1px solid var(--border-subtle)", overflowY: "auto" }} className="scrollbar-thin">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Meeting Notes</span>
          <button onClick={addNote} title="New note" style={{ color: "var(--text-tertiary)" }}>
            <Plus size={15} />
          </button>
        </div>
        {notes.map((n) => (
          <button
            key={n.id}
            onClick={() => setSelectedId(n.id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "10px 14px",
              background: (selected?.id === n.id) ? "var(--bg-surface-raised)" : "transparent",
              borderLeft: (selected?.id === n.id) ? "2px solid var(--accent)" : "2px solid transparent",
            }}
          >
            <div style={{ fontSize: 13 }}>{n.title}</div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{format(new Date(n.meeting_date), "PP")}</div>
          </button>
        ))}
        {notes.length === 0 && <div style={{ padding: 14, fontSize: 12, color: "var(--text-tertiary)" }}>No meeting notes yet.</div>}
      </div>

      <div style={{ flex: 1, padding: "var(--space-5)", overflowY: "auto" }} className="scrollbar-thin">
        {selected ? (
          <MeetingNoteEditor key={selected.id} note={selected} onSaved={refresh} />
        ) : (
          <div style={{ color: "var(--text-tertiary)" }}>Select or create a meeting note.</div>
        )}
      </div>
    </div>
  );
}

function MeetingNoteEditor({ note, onSaved }: { note: MeetingNote; onSaved: () => void }) {
  const [attendees, setAttendees] = useState(note.attendees ?? "");
  const [body, setBody] = useState(note.notes);

  const status = useAutosave({ attendees, body }, async (v) => {
    await api.saveMeetingNote({ id: note.id, project_id: note.project_id, title: note.title, meeting_date: note.meeting_date, attendees: v.attendees, notes: v.body });
    onSaved();
  });

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{note.title}</h1>
        <AutosaveIndicator status={status} />
      </div>
      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4, marginBottom: 16 }}>{format(new Date(note.meeting_date), "PPP")}</div>

      <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Attendees</label>
      <input
        value={attendees}
        onChange={(e) => setAttendees(e.target.value)}
        placeholder="Comma-separated names"
        style={{ width: "100%", marginBottom: 16 }}
      />

      <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Notes</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={14}
        style={{ width: "100%", resize: "vertical", lineHeight: 1.6 }}
      />
    </div>
  );
}
