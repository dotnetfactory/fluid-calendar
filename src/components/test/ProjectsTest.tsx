"use client";

import { useState } from "react";

import { trpc } from "@/lib/trpc/client";

/**
 * Test component for Projects tRPC integration
 * This component demonstrates how to use tRPC for project operations
 */
export function ProjectsTest() {
  const [newProjectName, setNewProjectName] = useState("");

  // tRPC queries and mutations
  const {
    data: projects,
    isLoading,
    error,
    refetch,
  } = trpc.projects.getAll.useQuery();

  const createProjectMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      refetch();
      setNewProjectName("");
    },
  });

  const updateProjectMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteProjectMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProjectMutation.mutate({
        name: newProjectName.trim(),
        description: "Test project created via tRPC",
        status: "active",
      });
    }
  };

  const handleUpdateProject = (id: string, name: string) => {
    updateProjectMutation.mutate({
      id,
      name: `${name} (Updated)`,
    });
  };

  const handleDeleteProject = (id: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProjectMutation.mutate({ id });
    }
  };

  if (isLoading) return <div>Loading projects...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">Projects tRPC Test</h2>

      {/* Create Project */}
      <div className="mb-4">
        <input
          type="text"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="Enter project name"
          className="border p-2 mr-2"
        />
        <button
          onClick={handleCreateProject}
          disabled={createProjectMutation.isPending}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {createProjectMutation.isPending ? "Creating..." : "Create Project"}
        </button>
      </div>

      {/* Projects List */}
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Projects ({projects?.length || 0})
        </h3>
        {projects?.map((project) => (
          <div
            key={project.id}
            className="border p-2 mb-2 flex justify-between items-center"
          >
            <div>
              <strong>{project.name}</strong>
              {project.description && (
                <p className="text-sm text-gray-600">{project.description}</p>
              )}
              <p className="text-xs text-gray-500">
                Status: {project.status} | Tasks: {project._count?.tasks || 0}
              </p>
            </div>
            <div>
              <button
                onClick={() => handleUpdateProject(project.id, project.name)}
                disabled={updateProjectMutation.isPending}
                className="bg-yellow-500 text-white px-2 py-1 rounded mr-2 disabled:opacity-50"
              >
                Update
              </button>
              <button
                onClick={() => handleDeleteProject(project.id)}
                disabled={deleteProjectMutation.isPending}
                className="bg-red-500 text-white px-2 py-1 rounded disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Mutation Status */}
      {createProjectMutation.error && (
        <div className="text-red-500 mt-2">
          Create Error: {createProjectMutation.error.message}
        </div>
      )}
      {updateProjectMutation.error && (
        <div className="text-red-500 mt-2">
          Update Error: {updateProjectMutation.error.message}
        </div>
      )}
      {deleteProjectMutation.error && (
        <div className="text-red-500 mt-2">
          Delete Error: {deleteProjectMutation.error.message}
        </div>
      )}
    </div>
  );
}
