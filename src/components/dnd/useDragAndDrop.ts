import { useDraggable, useDroppable } from "@dnd-kit/core";

import { Project } from "@/types/project";
import { Task } from "@/types/task";

export function useDraggableTask(task: Task) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: {
        type: "task",
        task,
      },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return {
    draggableProps: {
      ...attributes,
      ...listeners,
      ref: setNodeRef,
      style,
    },
    isDragging,
  };
}

export function useDroppableProject(project?: Project | null) {
  const id = project?.id ?? "remove-project";
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: "project",
      project,
    },
  });

  return {
    droppableProps: {
      ref: setNodeRef,
    },
    isOver,
  };
}
