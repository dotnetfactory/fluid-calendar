"use client";

import { Task, TaskStatus } from "@/types/task";
import { useProjectStore } from "@/store/project";
import { useTaskListViewSettings } from "@/store/taskListViewSettings";
import { useMemo } from "react";
import { Column } from "./Column";
import { DndContext, DragEndEvent } from "@dnd-kit/core";

interface BoardViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

export function BoardView({
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
}: BoardViewProps) {
  const { activeProject } = useProjectStore();
  const { energyLevel, timePreference, tagIds, search } =
    useTaskListViewSettings();

  // First, filter by project
  const projectFilteredTasks = activeProject
    ? activeProject.id === "no-project"
      ? tasks.filter((task) => !task.projectId)
      : tasks.filter((task) => task.projectId === activeProject.id)
    : tasks;

  // Then apply other filters
  const filteredTasks = useMemo(() => {
    return projectFilteredTasks.filter((task) => {
      // Energy level filter
      if (
        energyLevel?.length &&
        (!task.energyLevel || !energyLevel.includes(task.energyLevel))
      ) {
        return false;
      }

      // Time preference filter
      if (
        timePreference?.length &&
        (!task.preferredTime || !timePreference.includes(task.preferredTime))
      ) {
        return false;
      }

      // Tags filter
      if (tagIds?.length) {
        const taskTagIds = task.tags.map((t) => t.id);
        if (!tagIds.some((id) => taskTagIds.includes(id))) {
          return false;
        }
      }

      // Search
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower) ||
          task.tags.some((tag) => tag.name.toLowerCase().includes(searchLower))
        );
      }

      return true;
    });
  }, [projectFilteredTasks, energyLevel, timePreference, tagIds, search]);

  // Group tasks by status
  const columns = useMemo(() => {
    const grouped = Object.values(TaskStatus).reduce((acc, status) => {
      acc[status] = filteredTasks.filter((task) => task.status === status);
      return acc;
    }, {} as Record<TaskStatus, Task[]>);
    return grouped;
  }, [filteredTasks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    if (Object.values(TaskStatus).includes(newStatus)) {
      onStatusChange(taskId, newStatus);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background p-4">
      <div className="flex-1 flex gap-4 overflow-auto">
        <DndContext onDragEnd={handleDragEnd}>
          {Object.values(TaskStatus).map((status) => (
            <Column
              key={status}
              status={status}
              tasks={columns[status]}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </DndContext>
      </div>
    </div>
  );
}
