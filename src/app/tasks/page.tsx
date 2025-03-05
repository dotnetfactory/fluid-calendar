"use client";

import { useState, useEffect } from "react";
import { TaskList } from "@/components/tasks/TaskList";
import { BoardView } from "@/components/tasks/BoardView/BoardView";
import { TaskModal } from "@/components/tasks/TaskModal";
import { useTaskStore } from "@/store/task";
import { useProjectStore } from "@/store/project";
import { useTaskPageSettings } from "@/store/taskPageSettings";
import { Task, TaskStatus, NewTask } from "@/types/task";
import { ProjectSidebar } from "@/components/projects/ProjectSidebar";
import { BsListTask, BsKanban } from "react-icons/bs";
import { cn } from "@/lib/utils";
import { useTaskModalStore } from "@/store/taskModal";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function TasksPage() {
  const {
    tasks,
    tags,
    loading,
    error,
    fetchTasks,
    fetchTags,
    createTask,
    updateTask,
    deleteTask,
    createTag,
    scheduleAllTasks,
  } = useTaskStore();
  const { fetchProjects } = useProjectStore();
  const { viewMode, setViewMode } = useTaskPageSettings();
  const { isOpen, setOpen } = useTaskModalStore();

  const [selectedTask, setSelectedTask] = useState<Task | undefined>();

  // Fetch tasks and tags on mount
  useEffect(() => {
    fetchTasks();
    fetchTags();
    fetchProjects();
  }, [fetchTasks, fetchTags, fetchProjects]);

  const handleCreateTask = async (task: NewTask) => {
    await createTask(task);
    await fetchTasks();
    await fetchProjects();
  };

  const handleUpdateTask = async (task: NewTask) => {
    if (selectedTask) {
      await updateTask(selectedTask.id, task);
      await fetchTasks();
      await fetchProjects();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      await deleteTask(taskId);
      await fetchTasks();
      await fetchProjects();
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    await updateTask(taskId, { status });
    await fetchTasks();
    await fetchProjects();
  };

  const handleCreateTag = async (name: string, color?: string) => {
    try {
      const newTag = await createTag({ name, color });
      await fetchTags(); // Refresh tags after creation
      return newTag;
    } catch (error) {
      console.error("Error creating tag:", error);
      throw error;
    }
  };

  const handleInlineEdit = async (task: Task) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, tags, createdAt, updatedAt, project, ...updates } = task;
    console.log("Updating task:", { id, updates });
    await updateTask(id, updates);
    await fetchTasks();
    // If projectId was changed, refresh projects to update task counts
    if ("projectId" in updates) {
      await fetchProjects();
    }
  };

  return (
    <div className="flex h-full">
      <ProjectSidebar />
      <div className="flex-1 flex flex-col min-w-0" data-task-page>
        <div className="px-6 py-4 border-b border-border">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 rounded-md text-sm font-medium flex items-center gap-2",
                    viewMode === "list"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <BsListTask className="h-4 w-4" />
                  List
                </button>
                <button
                  onClick={() => setViewMode("board")}
                  className={cn(
                    "p-2 rounded-md text-sm font-medium flex items-center gap-2",
                    viewMode === "board"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <BsKanban className="h-4 w-4" />
                  Board
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  if (
                    confirm(
                      "Auto-schedule all tasks marked for auto-scheduling?"
                    )
                  ) {
                    scheduleAllTasks();
                  }
                }}
              >
                Auto Schedule
              </Button>
              <Button
                data-create-task-button
                onClick={() => {
                  setSelectedTask(undefined);
                  setOpen(true);
                }}
              >
                Create Task
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 p-6">
          {viewMode === "list" ? (
            <TaskList
              tasks={tasks}
              onEdit={(task) => {
                setSelectedTask(task);
                setOpen(true);
              }}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
              onInlineEdit={handleInlineEdit}
            />
          ) : (
            <BoardView
              tasks={tasks}
              onEdit={(task) => {
                setSelectedTask(task);
                setOpen(true);
              }}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
            />
          )}
        </div>

        <TaskModal
          isOpen={isOpen}
          onClose={() => {
            setOpen(false);
            setSelectedTask(undefined);
          }}
          onSave={selectedTask ? handleUpdateTask : handleCreateTask}
          task={selectedTask}
          tags={tags}
          onCreateTag={handleCreateTag}
        />

        {loading && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-background rounded-lg p-4 shadow-lg border">
            <LoadingSpinner size="lg" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
