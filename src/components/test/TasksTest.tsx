"use client";

import { useState } from "react";

import { trpc } from "@/lib/trpc/client";

/**
 * Test component for Tasks tRPC integration
 * This component demonstrates how to use the tasks tRPC procedures
 */
export function TasksTest() {
  const [taskTitle, setTaskTitle] = useState("");

  // tRPC queries and mutations
  const {
    data: tasks,
    isLoading,
    refetch,
  } = trpc.tasks.getAll.useQuery({
    hideUpcomingTasks: false,
  });

  const createTaskMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      refetch();
      setTaskTitle("");
    },
  });

  const updateTaskMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteTaskMutation = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const normalizeRecurrenceMutation =
    trpc.tasks.normalizeRecurrence.useMutation();

  const scheduleAllMutation = trpc.tasks.scheduleAll.useMutation();

  const handleCreateTask = () => {
    if (!taskTitle.trim()) return;

    createTaskMutation.mutate({
      title: taskTitle,
      description: "Test task created via tRPC",
      status: "TODO",
    });
  };

  const handleUpdateTask = (taskId: string) => {
    updateTaskMutation.mutate({
      taskId,
      data: {
        status: "COMPLETED",
      },
    });
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate({
      taskId,
    });
  };

  const handleNormalizeRecurrence = () => {
    normalizeRecurrenceMutation.mutate({
      recurrenceRule: "FREQ=DAILY;INTERVAL=1",
    });
  };

  const handleScheduleAll = () => {
    scheduleAllMutation.mutate({
      forceReschedule: false,
    });
  };

  if (isLoading) {
    return <div className="p-4">Loading tasks...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Tasks tRPC Test</h2>

      {/* Create Task Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Create Task</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Enter task title..."
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={handleCreateTask}
            disabled={createTaskMutation.isPending || !taskTitle.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {createTaskMutation.isPending ? "Creating..." : "Create Task"}
          </button>
        </div>
        {createTaskMutation.error && (
          <p className="text-red-500 mt-2">
            Error: {createTaskMutation.error.message}
          </p>
        )}
      </div>

      {/* Utility Functions Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Utility Functions</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleNormalizeRecurrence}
            disabled={normalizeRecurrenceMutation.isPending}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
          >
            {normalizeRecurrenceMutation.isPending
              ? "Normalizing..."
              : "Test Normalize Recurrence"}
          </button>
          <button
            onClick={handleScheduleAll}
            disabled={scheduleAllMutation.isPending}
            className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
          >
            {scheduleAllMutation.isPending
              ? "Scheduling..."
              : "Schedule All Tasks"}
          </button>
        </div>

        {normalizeRecurrenceMutation.data && (
          <div className="mt-2 p-2 bg-green-50 rounded">
            <p className="text-sm">
              Normalized Rule: {normalizeRecurrenceMutation.data.normalizedRule}
            </p>
          </div>
        )}

        {scheduleAllMutation.data && (
          <div className="mt-2 p-2 bg-purple-50 rounded">
            <p className="text-sm">
              {scheduleAllMutation.data.message} (Scheduled:{" "}
              {scheduleAllMutation.data.scheduledCount})
            </p>
          </div>
        )}

        {(normalizeRecurrenceMutation.error || scheduleAllMutation.error) && (
          <p className="text-red-500 mt-2">
            Error:{" "}
            {normalizeRecurrenceMutation.error?.message ||
              scheduleAllMutation.error?.message}
          </p>
        )}
      </div>

      {/* Tasks List Section */}
      <div className="p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">
          Tasks ({tasks?.length || 0})
        </h3>

        {tasks && tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 border rounded"
              >
                <div className="flex-1">
                  <h4 className="font-medium">{task.title}</h4>
                  <p className="text-sm text-gray-600">
                    Status: {task.status} |
                    {task.project && ` Project: ${task.project.name} |`}
                    {task.tags &&
                      task.tags.length > 0 &&
                      ` Tags: ${task.tags.map((t) => t.name).join(", ")} |`}
                    {task.dueDate &&
                      ` Due: ${new Date(task.dueDate).toLocaleDateString()}`}
                  </p>
                  {task.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {task.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {task.status !== "COMPLETED" && (
                    <button
                      onClick={() => handleUpdateTask(task.id)}
                      disabled={updateTaskMutation.isPending}
                      className="px-3 py-1 bg-green-500 text-white text-sm rounded disabled:opacity-50"
                    >
                      Complete
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    disabled={deleteTaskMutation.isPending}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No tasks found. Create one above!</p>
        )}

        {(updateTaskMutation.error || deleteTaskMutation.error) && (
          <p className="text-red-500 mt-2">
            Error:{" "}
            {updateTaskMutation.error?.message ||
              deleteTaskMutation.error?.message}
          </p>
        )}
      </div>

      {/* Debug Info */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Debug Info</h3>
        <p className="text-sm">
          • Tasks loaded: {tasks?.length || 0}
          <br />• Create mutation status: {createTaskMutation.status}
          <br />• Update mutation status: {updateTaskMutation.status}
          <br />• Delete mutation status: {deleteTaskMutation.status}
        </p>
      </div>
    </div>
  );
}
