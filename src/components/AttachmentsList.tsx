import { useEffect, useState } from "react";
import { Paperclip, Trash2, Plus } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { api, Attachment } from "@/lib/api";

export function AttachmentsList({ projectId, entityType, entityId }: { projectId: string; entityType: string; entityId: string }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const refresh = () => {
    api.listAttachments(projectId, entityType, entityId).then(setAttachments).catch(console.error);
  };
  useEffect(refresh, [projectId, entityType, entityId]);

  const pickFile = async () => {
    const selected = await open({ multiple: false });
    if (!selected || Array.isArray(selected)) return;
    const fileName = selected.split(/[\\/]/).pop() ?? selected;
    await api.addAttachment(projectId, entityType, entityId, selected, fileName);
    refresh();
  };

  const remove = async (id: string) => {
    await api.deleteAttachment(id);
    refresh();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>Attachments</h3>
        <button onClick={pickFile} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--accent-text)" }}>
          <Plus size={12} /> Add file
        </button>
      </div>
      {attachments.length === 0 && <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No files attached.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {attachments.map((a) => (
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "6px 8px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <Paperclip size={12} style={{ flexShrink: 0, color: "var(--text-tertiary)" }} />
              {a.file_name}
            </span>
            <button onClick={() => remove(a.id)} style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
