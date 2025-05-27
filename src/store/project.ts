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

  // Actions - these will be used by components that call tRPC directly
  // The store now mainly serves as a cache/state container
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProjectInStore: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setActiveProject: (project: Project | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;

  // Legacy actions for backward compatibility - these will be removed once all components use tRPC
  fetchProjects: () => Promise<void>;
  createProject: (project: NewProject) => Promise<Project>;
  updateProject: (id: string, updates: UpdateProject) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
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

      // New tRPC-compatible actions
      setProjects: (projects: Project[]) => {
        set({ projects });
      },

      addProject: (project: Project) => {
        set((state) => ({ projects: [...state.projects, project] }));
      },

      updateProjectInStore: (id: string, updates: Partial<Project>) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
          activeProject:
            state.activeProject?.id === id
              ? { ...state.activeProject, ...updates }
              : state.activeProject,
        }));
      },

      removeProject: (id: string) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProject:
            state.activeProject?.id === id ? null : state.activeProject,
        }));
      },

      setActiveProject: (project: Project | null) => {
        set({ activeProject: project });
      },

      setLoading: (loading: boolean) => {
        set({ loading });
      },

      setError: (error: Error | null) => {
        set({ error });
      },

      // Legacy API-based actions (deprecated - use tRPC directly in components)
      fetchProjects: async () => {
        console.warn(
          "fetchProjects is deprecated. Use tRPC trpc.projects.getAll.useQuery() instead."
        );
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
        console.warn(
          "createProject is deprecated. Use tRPC trpc.projects.create.useMutation() instead."
        );
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
        console.warn(
          "updateProject is deprecated. Use tRPC trpc.projects.update.useMutation() instead."
        );
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
        console.warn(
          "deleteProject is deprecated. Use tRPC trpc.projects.delete.useMutation() instead."
        );
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

      archiveProject: async (id: string) => {
        console.warn(
          "archiveProject is deprecated. Use tRPC trpc.projects.update.useMutation() instead."
        );
        return get().updateProject(id, { status: ProjectStatus.ARCHIVED });
      },

      unarchiveProject: async (id: string) => {
        console.warn(
          "unarchiveProject is deprecated. Use tRPC trpc.projects.update.useMutation() instead."
        );
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
