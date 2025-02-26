"use client";

import { useProjectStore } from "@/store/project";
import { useTaskStore } from "@/store/task";
import { useEffect, useState } from "react";
import { HiPlus, HiPencil, HiFolderOpen } from "react-icons/hi";
import { ProjectStatus, Project } from "@/types/project";
import { ProjectModal } from "./ProjectModal";
import { useDroppableProject } from "../dnd/useDragAndDrop";
import { TaskStatus } from "@/types/task";

// Special project object to represent "no project" state
const NO_PROJECT: Partial<Project> = {
  id: "no-project",
  name: "No Project",
};

export function ProjectSidebar() {
  const {
    projects,
    loading,
    error,
    fetchProjects,
    setActiveProject,
    activeProject,
  } = useProjectStore();
  const { tasks } = useTaskStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();

  const { droppableProps: removeProjectProps, isOver: isOverRemove } =
    useDroppableProject(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const activeProjects = projects.filter(
    (project) => project.status === ProjectStatus.ACTIVE
  );
  const archivedProjects = projects.filter(
    (project) => project.status === ProjectStatus.ARCHIVED
  );

  // Count non-completed tasks with no project
  const unassignedTasksCount = tasks.filter(
    (task) => !task.projectId && task.status !== TaskStatus.COMPLETED
  ).length;

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="w-64 h-full bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
            <button
              className="p-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => {
                setSelectedProject(undefined);
                setIsModalOpen(true);
              }}
            >
              <HiPlus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1">
            <button
              className={`w-full text-left px-3 py-2 rounded-md ${
                !activeProject
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setActiveProject(null)}
            >
              All Tasks
            </button>
            <button
              className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
                activeProject?.id === NO_PROJECT.id
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setActiveProject(NO_PROJECT as Project)}
            >
              <HiFolderOpen className="h-4 w-4 text-gray-400" />
              <span className="flex-1">No Project</span>
              <span className="text-xs text-gray-500">
                {unassignedTasksCount}
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-gray-500">Loading projects...</div>
            </div>
          ) : error ? (
            <div className="text-sm text-red-600 p-2">{error.message}</div>
          ) : (
            <>
              {activeProjects.length > 0 && (
                <div className="space-y-1">
                  {activeProjects.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      isActive={activeProject?.id === project.id}
                      onEdit={handleEditProject}
                    />
                  ))}
                </div>
              )}

              {archivedProjects.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider py-2">
                    Archived
                  </div>
                  {archivedProjects.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      isActive={activeProject?.id === project.id}
                      onEdit={handleEditProject}
                    />
                  ))}
                </div>
              )}

              {projects.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">
                  No projects yet
                </div>
              )}

              {/* Remove from project drop zone */}
              <div
                {...removeProjectProps}
                className={`mt-4 border-2 border-dashed rounded-md p-4 text-center
                  ${
                    isOverRemove
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
              >
                <p className="text-sm text-gray-500">
                  Drop here to remove from project
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProject(undefined);
        }}
        project={selectedProject}
      />
    </>
  );
}

interface ProjectItemProps {
  project: Project;
  isActive: boolean;
  onEdit: (project: Project) => void;
}

function ProjectItem({ project, isActive, onEdit }: ProjectItemProps) {
  const { setActiveProject } = useProjectStore();
  const { tasks } = useTaskStore();
  const { droppableProps, isOver } = useDroppableProject(project);

  // Count non-completed tasks for this project
  const taskCount = tasks.filter(
    (task) =>
      task.projectId === project.id && task.status !== TaskStatus.COMPLETED
  ).length;

  return (
    <div
      {...droppableProps}
      className={`w-full text-left px-3 py-2 rounded-md flex items-center space-x-2 group 
        ${
          isActive
            ? "bg-blue-50 text-blue-700 font-medium"
            : "text-gray-700 hover:bg-gray-100"
        }
        ${isOver ? "ring-2 ring-blue-500 ring-opacity-50" : ""}
        cursor-pointer`}
      onClick={() => setActiveProject(project)}
    >
      {project.color && (
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: project.color }}
        />
      )}
      <span className="truncate flex-1 project-name">{project.name}</span>
      <span className="text-xs text-gray-500">{taskCount}</span>
      <button
        className="p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(project);
        }}
      >
        <HiPencil className="h-3 w-3 text-gray-500" />
      </button>
    </div>
  );
}
