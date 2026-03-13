"use client";

import { type ReactNode } from "react";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { useProjectStore } from "@/store/project";
import { useTaskStore } from "@/store/task";

interface DndProviderProps {
  children: ReactNode;
}

export function DndProvider({ children }: DndProviderProps) {
  const { updateTask } = useTaskStore();
  const { fetchProjects } = useProjectStore();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over) return;

    // Handle dropping a task onto a project
    if (
      active.data.current?.type === "task" &&
      over.data.current?.type === "project"
    ) {
      const taskId = active.id as string;
      const projectId =
        over.id === "remove-project" ? null : (over.id as string);

      // Optimistically update the task
      await updateTask(taskId, { projectId });

      // Refetch projects to update task counts
      fetchProjects();
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlay />
    </DndContext>
  );
}
