import { Rocket } from "lucide-react";

export function OnboardingView({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "var(--space-6)",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          background: "var(--accent-dim)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "var(--space-5)",
        }}
      >
        <Rocket size={26} color="var(--accent-text)" />
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Set up your first project</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 8, maxWidth: 380 }}>
        AetherPM keeps everything — tasks, requirements, diagrams, risks — local to this machine,
        organized per project. Create one to get started.
      </p>
      <button
        onClick={onCreateProject}
        style={{
          marginTop: "var(--space-5)",
          padding: "9px 18px",
          background: "var(--accent)",
          color: "#08131a",
          borderRadius: "var(--radius-sm)",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        New project
      </button>
    </div>
  );
}
