import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Send } from "lucide-react";
import { api, Comment, ProjectMember } from "@/lib/api";

export function CommentThread({ projectId, entityType, entityId }: { projectId: string; entityType: string; entityId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const refresh = () => {
    api.listComments(projectId, entityType, entityId).then(setComments).catch(console.error);
  };

  useEffect(() => {
    refresh();
    api.listMembers(projectId).then(setMembers).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, entityType, entityId]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await api.saveComment(projectId, entityType, entityId, body.trim());
      setBody("");
      refresh();
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {comments.map((c) => (
          <div key={c.id}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-tertiary)" }}>
              <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{c.author_name}</span>
              <span>{format(new Date(c.created_at), "PPp")}</span>
            </div>
            <div style={{ fontSize: 13, marginTop: 2, whiteSpace: "pre-wrap" }}>{renderWithMentions(c.body)}</div>
          </div>
        ))}
        {comments.length === 0 && <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No comments yet.</div>}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={members.length > 0 ? `Comment, or @mention someone…` : "Add a comment…"}
          style={{ flex: 1 }}
        />
        <button
          onClick={send}
          disabled={!body.trim() || sending}
          style={{ padding: "0 10px", background: "var(--accent-dim)", color: "var(--accent-text)", borderRadius: "var(--radius-sm)" }}
        >
          <Send size={14} />
        </button>
      </div>
      {members.length > 0 && (
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
          Members: {members.map((m) => `@${m.display_name}`).join(", ")}
        </div>
      )}
    </div>
  );
}

function renderWithMentions(body: string) {
  const parts = body.split(/(@[A-Za-z0-9_ ]+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} style={{ color: "var(--accent-text)", fontWeight: 500 }}>
        {part}
      </span>
    ) : (
      part
    )
  );
}
