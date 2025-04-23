import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  NewProject,
  Project,
  ProjectStatus,
  UpdateProject,
} from "@/types/project";

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  loading: boolean;
  error: Error | null;

  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (project: NewProject) => Promise<Project>;
  updateProject: (id: string, updates: UpdateProject) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  setActiveProject: (project: Project | null) => void;
  archiveProject: (id: string) => Promise<Project>;
  unarchiveProject: (id: string) => Promise<Project>;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProject: null,
      loading: false,
      error: null,

      fetchProjects: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch("/api/projects");
          if (!response.ok) throw new Error("Failed to fetch projects");
          const projects = await response.json();
          set({ projects });
        } catch (error) {
          set({ error: error as Error });
        } finally {
          set({ loading: false });
        }
      },

      createProject: async (project: NewProject) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(project),
          });
          if (!response.ok) throw new Error("Failed to create project");
          const newProject = await response.json();
          set((state) => ({ projects: [...state.projects, newProject] }));
          return newProject;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updateProject: async (id: string, updates: UpdateProject) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/projects/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });
          if (!response.ok) throw new Error("Failed to update project");
          const updatedProject = await response.json();
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === id ? updatedProject : p
            ),
            activeProject:
              state.activeProject?.id === id
                ? updatedProject
                : state.activeProject,
          }));
          return updatedProject;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      deleteProject: async (id: string) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/projects/${id}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            const error = await response.text();
            throw new Error(error || "Failed to delete project");
          }

          const result = await response.json();

          // Optimistically update the UI
          set((state) => ({
            projects: state.projects.filter((p) => p.id !== id),
            activeProject:
              state.activeProject?.id === id ? null : state.activeProject,
          }));

          return result;
        } catch (error) {
          set({ error: error as Error });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      setActiveProject: (project: Project | null) => {
        set({ activeProject: project });
      },

      archiveProject: async (id: string) => {
        return get().updateProject(id, { status: ProjectStatus.ARCHIVED });
      },

      unarchiveProject: async (id: string) => {
        return get().updateProject(id, { status: ProjectStatus.ACTIVE });
      },
    }),
    {
      name: "project-store",
      partialize: (state) => ({
        activeProject: state.activeProject,
      }),
    }
  )
);
