export function PlaceholderView({ title, note }: { title: string; note: string }) {
  return (
    <div style={{ padding: "var(--space-6)", maxWidth: 480 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{title}</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 8 }}>{note}</p>
    </div>
  );
}
