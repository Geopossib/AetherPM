import { create } from "zustand";
import type { Project } from "@/lib/api";

interface AppState {
  projects: Project[];
  currentProjectId: string | null;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  theme: "dark" | "light";

  setProjects: (p: Project[]) => void;
  setCurrentProject: (id: string | null) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  projects: [],
  currentProjectId: null,
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  theme: "dark",

  setProjects: (projects) => set({ projects }),
  setCurrentProject: (currentProjectId) => set({ currentProjectId }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
}));
