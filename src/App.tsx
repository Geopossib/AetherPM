import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { CommandPalette } from "@/components/CommandPalette";
import { NewProjectModal } from "@/components/NewProjectModal";
import { OnboardingView } from "@/features/dashboard/OnboardingView";
import { DashboardView } from "@/features/dashboard/DashboardView";
import { BoardView } from "@/features/tasks/BoardView";
import { PlanningView } from "@/features/tasks/PlanningView";
import { RequirementsView } from "@/features/requirements/RequirementsView";
import { ModelExplorerView } from "@/features/sysml/ModelExplorerView";
import { RiskRegisterView } from "@/features/dashboard/RiskRegisterView";
import { MeetingNotesView } from "@/features/dashboard/MeetingNotesView";
import { DecisionLogView } from "@/features/dashboard/DecisionLogView";
import { SettingsView } from "@/features/settings/SettingsView";
import { useAppStore } from "@/stores/appStore";
import { api } from "@/lib/api";

export default function App() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const theme = useAppStore((s) => s.theme);
  const projects = useAppStore((s) => s.projects);
  const setProjects = useAppStore((s) => s.setProjects);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const [loaded, setLoaded] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);

  // On first launch, load projects from the local SQLite DB via Rust,
  // and select the first one so the workspace isn't empty.
  useEffect(() => {
    api
      .listProjects()
      .then((loadedProjects) => {
        setProjects(loadedProjects);
        if (!currentProjectId && loadedProjects.length > 0) {
          setCurrentProject(loadedProjects[0].id);
        }
      })
      .catch((err) => console.error("Failed to load projects:", err))
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  const refreshProjects = async (selectId?: string) => {
    const updated = await api.listProjects();
    setProjects(updated);
    if (selectId) setCurrentProject(selectId);
  };

  // Nothing to show yet on a brand-new install: skip straight to the
  // onboarding empty state instead of an empty sidebar/dashboard shell.
  if (loaded && projects.length === 0) {
    return (
      <div className="app-shell">
        <Sidebar />
        <TopBar />
        <main className="main-area">
          <OnboardingView onCreateProject={() => setShowNewProject(true)} />
        </main>
        {showNewProject && (
          <NewProjectModal onClose={() => setShowNewProject(false)} onCreated={(id) => refreshProjects(id)} />
        )}
      </div>
    );
  }

  return (
    <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <Sidebar />
      <TopBar onNewProject={() => setShowNewProject(true)} />
      <main className="main-area scrollbar-thin">
        <Routes>
          <Route path="/" element={<DashboardView />} />
          <Route path="/board" element={<BoardView />} />
          <Route path="/timeline" element={<PlanningView />} />
          <Route path="/requirements" element={<RequirementsView />} />
          <Route path="/model" element={<ModelExplorerView />} />
          <Route path="/risks" element={<RiskRegisterView />} />
          <Route path="/decisions" element={<DecisionLogView />} />
          <Route path="/notes" element={<MeetingNotesView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </main>
      <CommandPalette />
      {showNewProject && (
        <NewProjectModal onClose={() => setShowNewProject(false)} onCreated={(id) => refreshProjects(id)} />
      )}
    </div>
  );
}
