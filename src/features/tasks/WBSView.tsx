import { useEffect, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { api, Task } from "@/lib/api";

interface TreeNode {
  task: Task;
  children: TreeNode[];
}

function buildTree(tasks: Task[]): TreeNode[] {
  const byId = new Map(tasks.map((t) => [t.id, { task: t, children: [] as TreeNode[] }]));
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    if (node.task.parent_task_id && byId.has(node.task.parent_task_id)) {
      byId.get(node.task.parent_task_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function Row({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", paddingLeft: 8 + depth * 20 }}>
        {hasChildren ? (
          <button onClick={() => setOpen(!open)} style={{ color: "var(--text-tertiary)" }}>
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <span style={{ width: 13 }} />
        )}
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: node.task.status === "Done" ? "var(--status-success)" : "var(--accent)",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 13 }}>{node.task.title}</span>
        {node.task.estimate_hours != null && (
          <span className="mono" style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: "auto" }}>
            {node.task.estimate_hours}h
          </span>
        )}
      </div>
      {open && node.children.map((c) => <Row key={c.task.id} node={c} depth={depth + 1} />)}
    </div>
  );
}

export function WBSView() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (currentProjectId) api.listTasks(currentProjectId).then(setTasks).catch(console.error);
  }, [currentProjectId]);

  if (!currentProjectId) {
    return <div style={{ padding: "var(--space-6)", color: "var(--text-secondary)" }}>Select a project first.</div>;
  }

  const tree = buildTree(tasks);
  const totalEstimate = tasks.reduce((sum, t) => sum + (t.estimate_hours || 0), 0);

  return (
    <div style={{ padding: "var(--space-5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Work Breakdown Structure</h2>
        {totalEstimate > 0 && <span className="mono" style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{totalEstimate}h total estimated</span>}
      </div>
      {tree.length === 0 ? (
        <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
          No tasks yet. Set a task's "parent" when creating it on the Board to build a hierarchy here.
        </p>
      ) : (
        <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "6px 0" }}>
          {tree.map((n) => (
            <Row key={n.task.id} node={n} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}
